/**
 * Logging wrappers around the OpenRouter client (plan 05): every LLM call writes
 * an LlmCallLog row (token/cost/latency/success) — metadata only, never code.
 *
 * The wrapper is decoupled from Prisma via a `log` callback so it works with the
 * worker's own PrismaClient instance. Use `createLlmCallLogger(prisma, repoId)`
 * to build that callback.
 */

import type { PrismaClient } from "@prisma/client";
import {
  callLlm,
  parseJsonLoose,
  LlmError,
  type CallLlmOptions,
  type LlmResult,
  type LlmUsage,
  type LlmPurpose,
} from "./openrouter";

export interface LlmLogEntry {
  repositoryId?: string;
  purpose: LlmPurpose;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

export type LlmLogFn = (entry: LlmLogEntry) => Promise<void> | void;

export interface LlmLogCtx {
  repositoryId?: string;
  log?: LlmLogFn;
}

/** Build a log callback that persists to LlmCallLog and never throws. */
export function createLlmCallLogger(prisma: PrismaClient, repositoryId?: string, userId?: string): LlmLogFn {
  return async (entry) => {
    try {
      await prisma.llmCallLog.create({
        data: {
          repositoryId: entry.repositoryId ?? repositoryId ?? null,
          userId: userId ?? null,
          purpose: entry.purpose,
          model: entry.model,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
          costUsd: entry.costUsd,
          latencyMs: entry.latencyMs,
          success: entry.success,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (e) {
      console.warn("[llm] failed to write LlmCallLog:", (e as Error).message);
    }
  };
}

const ZERO: LlmUsage = { promptTokens: 0, completionTokens: 0, costUsd: 0 };

/** callLlm + LlmCallLog. */
export async function callLlmLogged(opts: CallLlmOptions, ctx: LlmLogCtx = {}): Promise<LlmResult> {
  const t0 = Date.now();
  try {
    const res = await callLlm(opts);
    await ctx.log?.({
      repositoryId: ctx.repositoryId,
      purpose: opts.purpose,
      model: res.model,
      ...res.usage,
      latencyMs: Date.now() - t0,
      success: true,
    });
    return res;
  } catch (err) {
    await ctx.log?.({
      repositoryId: ctx.repositoryId,
      purpose: opts.purpose,
      model: "(none)",
      ...ZERO,
      latencyMs: Date.now() - t0,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * callLlmJson + LlmCallLog with a single parse-retry (plan 04/05): each attempt
 * is logged; the call is retried once if the reply fails JSON parse/validation.
 * Uses json_schema structured output when `opts.responseSchema` is set.
 */
export async function callLlmJsonLogged<T>(
  opts: CallLlmOptions,
  validate: (value: unknown) => T,
  ctx: LlmLogCtx = {}
): Promise<{ value: T; usage: LlmUsage; model: string }> {
  const callOpts: CallLlmOptions = { ...opts, json: opts.responseSchema ? false : true };
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await callLlmLogged(callOpts, ctx);
    try {
      const value = validate(parseJsonLoose(res.content));
      return { value, usage: res.usage, model: res.model };
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw new LlmError(`LLM JSON validation failed after retry: ${lastErr?.message ?? "unknown"}`, false);
}
