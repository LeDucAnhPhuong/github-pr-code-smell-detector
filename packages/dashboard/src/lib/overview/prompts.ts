/**
 * Prompt building, clustering, metadata shape, and small concurrency/condense
 * helpers for the Overview map-reduce (plan 02). Kept free of GitHub/Prisma/LLM
 * imports so it stays unit-testable.
 */

export interface FileWithContent {
  path: string;
  content: string;
}

export interface FileCluster {
  /** Directory key, e.g. "src/components" or "(root)". */
  dir: string;
  files: FileWithContent[];
}

const PER_FILE_CHARS = Number(process.env.OVERVIEW_PER_FILE_CHARS ?? 4_000);
const PER_CLUSTER_CHARS = Number(process.env.OVERVIEW_PER_CLUSTER_CHARS ?? 24_000);
const MAX_CLUSTERS = Number(process.env.OVERVIEW_MAX_CLUSTERS ?? 40);

/** Group files by their directory at depth ≤ 2 so each MAP call covers a coherent area. */
export function clusterByDirectory(files: FileWithContent[]): FileCluster[] {
  const byDir = new Map<string, FileWithContent[]>();
  for (const f of files) {
    const segments = f.path.split("/");
    const dir = segments.length === 1 ? "(root)" : segments.slice(0, Math.min(2, segments.length - 1)).join("/");
    const list = byDir.get(dir) ?? [];
    list.push(f);
    byDir.set(dir, list);
  }
  const clusters = Array.from(byDir.entries())
    .map(([dir, clusterFiles]) => ({ dir, files: clusterFiles }))
    .sort((a, b) => a.dir.localeCompare(b.dir));

  // Cap cluster count to bound the number of MAP calls; keep "(root)" + earliest.
  if (clusters.length <= MAX_CLUSTERS) return clusters;
  const root = clusters.filter((c) => c.dir === "(root)");
  const rest = clusters.filter((c) => c.dir !== "(root)").slice(0, MAX_CLUSTERS - root.length);
  return [...root, ...rest];
}

/** Render a cluster's files into a single bounded prompt body. */
function renderClusterBody(cluster: FileCluster): string {
  let body = "";
  for (const f of cluster.files) {
    if (body.length >= PER_CLUSTER_CHARS) break;
    const snippet = f.content.slice(0, PER_FILE_CHARS);
    body += `\n----- FILE: ${f.path} -----\n${snippet}\n`;
  }
  return body.slice(0, PER_CLUSTER_CHARS);
}

export const MAP_SYSTEM =
  "You are a senior engineer summarizing part of a codebase. Be concise and factual. " +
  "Describe ONLY what the provided files actually contain. Do not speculate about code you cannot see.";

export function buildMapPrompt(cluster: FileCluster): string {
  return (
    `Summarize the role of the directory "${cluster.dir}" within the larger project, based on these files.\n` +
    `Cover: its responsibility, the main modules/components, notable patterns or conventions, and key external libraries used.\n` +
    `Answer in 3-6 short bullet points. Files:\n${renderClusterBody(cluster)}`
  );
}

export interface OverviewMetadata {
  stack: string[];
  architecture: string[];
  modules: { name: string; description: string }[];
  conventions: string[];
  domain: string[];
  dependencies: string[];
}

export const REDUCE_SYSTEM =
  "You are a staff engineer writing an onboarding overview of a repository. " +
  "Synthesize the per-directory notes and manifest into one coherent picture. " +
  "Ground every statement in the provided material; never invent frameworks, modules, or domain concepts.";

export function buildReducePrompt(
  repoFullName: string,
  clusterSummaries: { dir: string; summary: string }[],
  manifests: FileWithContent[]
): string {
  const manifestBlock = manifests
    .map((m) => `----- ${m.path} -----\n${m.content.slice(0, PER_FILE_CHARS)}`)
    .join("\n\n");
  const summaryBlock = clusterSummaries
    .map((c) => `## ${c.dir}\n${c.summary}`)
    .join("\n\n");

  return (
    `Repository: ${repoFullName}\n\n` +
    `Manifests:\n${manifestBlock || "(none)"}\n\n` +
    `Per-directory notes:\n${summaryBlock || "(none)"}\n\n` +
    `Produce a JSON object with EXACTLY these keys:\n` +
    `- "summaryMd": a markdown document (tech stack, architecture, main modules, conventions, domain concepts, key dependencies).\n` +
    `- "metadata": an object with keys:\n` +
    `    "stack": string[] (languages, frameworks, runtimes),\n` +
    `    "architecture": string[] (high-level architectural notes),\n` +
    `    "modules": { "name": string, "description": string }[] (main modules/areas),\n` +
    `    "conventions": string[] (coding/naming/structure conventions observed),\n` +
    `    "domain": string[] (business/domain concepts),\n` +
    `    "dependencies": string[] (notable external libraries).\n` +
    `Use empty arrays for anything you genuinely cannot determine. Return ONLY the JSON object.`
  );
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

/** Validate + coerce the REDUCE JSON into a known shape. Lenient: missing keys → defaults. */
export function parseReduceOutput(value: unknown): { summaryMd: string; metadata: OverviewMetadata } {
  if (!value || typeof value !== "object") {
    throw new Error("Reduce output is not an object");
  }
  const obj = value as Record<string, unknown>;
  const summaryMd = typeof obj.summaryMd === "string" ? obj.summaryMd : "";
  if (!summaryMd.trim()) throw new Error("Reduce output missing summaryMd");

  const m = (obj.metadata && typeof obj.metadata === "object" ? obj.metadata : {}) as Record<string, unknown>;
  const modules = Array.isArray(m.modules)
    ? m.modules
        .map((x) => {
          if (x && typeof x === "object") {
            const o = x as Record<string, unknown>;
            const name = typeof o.name === "string" ? o.name.trim() : "";
            const description = typeof o.description === "string" ? o.description.trim() : "";
            return name ? { name, description } : null;
          }
          if (typeof x === "string" && x.trim()) return { name: x.trim(), description: "" };
          return null;
        })
        .filter((x): x is { name: string; description: string } => x !== null)
    : [];

  const metadata: OverviewMetadata = {
    stack: toStringArray(m.stack),
    architecture: toStringArray(m.architecture),
    modules,
    conventions: toStringArray(m.conventions),
    domain: toStringArray(m.domain),
    dependencies: toStringArray(m.dependencies),
  };

  return { summaryMd, metadata };
}

/**
 * Condensed overview for injection into PR analysis (plan 04) — just the
 * machine-useful essentials so we don't spend tokens re-sending the full doc.
 */
export function condenseOverview(metadata: Partial<OverviewMetadata> | null | undefined): string {
  if (!metadata) return "";
  const parts: string[] = [];
  if (metadata.stack?.length) parts.push(`Stack: ${metadata.stack.join(", ")}`);
  if (metadata.architecture?.length) parts.push(`Architecture: ${metadata.architecture.join("; ")}`);
  if (metadata.conventions?.length) parts.push(`Conventions: ${metadata.conventions.join("; ")}`);
  if (metadata.modules?.length) parts.push(`Modules: ${metadata.modules.map((mod) => mod.name).join(", ")}`);
  if (metadata.domain?.length) parts.push(`Domain: ${metadata.domain.join(", ")}`);
  return parts.join("\n");
}

/** Run `fn` over items with a bounded concurrency, preserving input order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
