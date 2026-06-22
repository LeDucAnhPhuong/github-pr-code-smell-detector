/**
 * Minimal OpenRouter chat client shared by Overview indexing (plan 02) and,
 * later, PR analysis (plan 04). Server/worker only — never import client-side;
 * it reads OPENROUTER_API_KEY.
 *
 * Responsibilities (plan 05 subset needed by 02):
 *  - pick a model per purpose, with fallback models on failure;
 *  - retry network/5xx/429 with backoff;
 *  - return token usage + cost so the caller can aggregate onto ProjectOverview.
 *
 * This intentionally does NOT write LlmCallLog yet — that table arrives with the
 * full plan 05. Callers aggregate usage themselves for now.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type LlmPurpose = "overview_map" | "overview_reduce" | "pr_map" | "pr_reduce";

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface LlmResult {
  content: string;
  model: string;
  usage: LlmUsage;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/**
 * Default model map. Each purpose lists primary + fallback model ids, tried in
 * order. Override entirely with the OPENROUTER_MODEL_MAP env var (JSON object
 * keyed by purpose → string[]). Model ids change over time; env is the source
 * of truth in production.
 */
const DEFAULT_MODEL_MAP: Record<LlmPurpose, string[]> = {
  overview_map: ["google/gemini-2.5-flash", "openai/gpt-4o-mini"],
  overview_reduce: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
  pr_map: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"],
  pr_reduce: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
};

function modelsFor(purpose: LlmPurpose): string[] {
  const raw = process.env.OPENROUTER_MODEL_MAP;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Record<LlmPurpose, string[]>>;
      const models = parsed[purpose];
      if (Array.isArray(models) && models.length > 0) return models;
    } catch {
      // fall through to defaults on malformed env
    }
  }
  return DEFAULT_MODEL_MAP[purpose];
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new LlmError("OPENROUTER_API_KEY is not set", false);
  return key;
}

function attributionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const url = process.env.OPENROUTER_APP_URL;
  if (url) headers["HTTP-Referer"] = url;
  headers["X-Title"] = process.env.OPENROUTER_APP_TITLE ?? "MergeTrack";
  return headers;
}

const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 90_000);
const MAX_ATTEMPTS = 3;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new LlmError("aborted", false));
      },
      { once: true }
    );
  });
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  usage?: OpenRouterUsage;
  error?: { message?: string };
}

export interface JsonSchemaSpec {
  /** Schema name (required by OpenRouter json_schema mode). */
  name: string;
  /** A JSON Schema object describing the expected response. */
  schema: Record<string, unknown>;
}

export interface CallLlmOptions {
  purpose: LlmPurpose;
  system: string;
  user: string;
  /** Force JSON output (json_object mode). Defaults to false (plain text). */
  json?: boolean;
  /**
   * Structured output: when set, request `response_format: json_schema` so the
   * model is constrained to this shape (falls back to plain json mode on models
   * that ignore it — we still validate with Zod afterwards).
   */
  responseSchema?: JsonSchemaSpec;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

function responseFormat(opts: CallLlmOptions): Record<string, unknown> | undefined {
  if (opts.responseSchema) {
    return {
      type: "json_schema",
      json_schema: { name: opts.responseSchema.name, strict: true, schema: opts.responseSchema.schema },
    };
  }
  if (opts.json) return { type: "json_object" };
  return undefined;
}

/** One chat call with model fallback + per-model retry/backoff. */
export async function callLlm(opts: CallLlmOptions): Promise<LlmResult> {
  const models = modelsFor(opts.purpose);
  let lastErr: Error | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const onAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey()}`,
            "Content-Type": "application/json",
            ...attributionHeaders(),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: opts.system },
              { role: "user", content: opts.user },
            ],
            temperature: opts.temperature ?? 0.2,
            ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
            ...((): Record<string, unknown> => {
              const rf = responseFormat(opts);
              return rf ? { response_format: rf } : {};
            })(),
            usage: { include: true },
          }),
        });

        if (!res.ok) {
          const retryable = res.status === 429 || res.status >= 500;
          const text = await res.text().catch(() => "");
          throw new LlmError(`OpenRouter ${res.status} (${model}): ${text.slice(0, 300)}`, retryable);
        }

        const data = (await res.json()) as OpenRouterResponse;
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new LlmError(`OpenRouter returned no content (${model})`, true);
        }

        return {
          content,
          model,
          usage: {
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            costUsd: data.usage?.cost ?? 0,
          },
        };
      } catch (err) {
        lastErr = err as Error;
        const retryable =
          err instanceof LlmError
            ? err.retryable
            : // AbortError (timeout) and network errors are retryable
              true;
        if (!retryable) throw err;
        if (attempt < MAX_ATTEMPTS) {
          await sleep(500 * 2 ** (attempt - 1), opts.signal); // 0.5s, 1s
          continue;
        }
        // exhausted retries for this model → fall through to next model
      } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
      }
    }
  }

  throw lastErr ?? new LlmError("All models failed", true);
}

/**
 * Call the model and parse its reply as JSON. Retries the parse once (the model
 * occasionally wraps JSON in prose or a code fence). `validate` should throw if
 * the shape is wrong.
 */
export async function callLlmJson<T>(
  opts: CallLlmOptions,
  validate: (value: unknown) => T
): Promise<{ value: T; usage: LlmUsage; model: string }> {
  // json_schema implies JSON; otherwise force json_object mode.
  const callOpts: CallLlmOptions = { ...opts, json: opts.responseSchema ? false : true };
  let lastErr: Error | null = null;
  // Plan 04: retry once on a parse/validation failure (model occasionally
  // returns malformed JSON even in json mode).
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await callLlm(callOpts);
    try {
      const value = validate(parseJsonLoose(result.content));
      return { value, usage: result.usage, model: result.model };
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw new LlmError(`LLM JSON validation failed after retry: ${lastErr?.message ?? "unknown"}`, false);
}

/** Tolerant JSON extraction: strips ```json fences and leading/trailing prose. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // try to extract the first {...} or [...] block
    const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(fenced);
    } catch {
      const start = fenced.search(/[{[]/);
      const end = Math.max(fenced.lastIndexOf("}"), fenced.lastIndexOf("]"));
      if (start >= 0 && end > start) {
        return JSON.parse(fenced.slice(start, end + 1));
      }
      throw new LlmError("Failed to parse LLM JSON output", false);
    }
  }
}
