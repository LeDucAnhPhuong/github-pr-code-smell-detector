import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

// Server-side only — uses the GitHub App private key. Never import in client components.

function privateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
  // Support keys stored with literal "\n" in a single-line env var.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function appId(): string {
  const id = process.env.GITHUB_APP_ID;
  if (!id) throw new Error("GITHUB_APP_ID is not set");
  return id;
}

/** Mint a short-lived (~1h) installation access token for a given installation. */
export async function getInstallationToken(installationId: number): Promise<string> {
  const auth = createAppAuth({ appId: appId(), privateKey: privateKey() });
  const { token } = await auth({ type: "installation", installationId });
  return token;
}

/** An Octokit authenticated as the installation (for listing repos, etc.). */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token });
}

/** The GitHub App slug used to build the install URL. */
export function appSlug(): string {
  return process.env.GITHUB_APP_SLUG ?? "";
}

// ─── Repo introspection (used by Overview indexing — plan 02) ──────────────────

export interface RepoTreeEntry {
  /** Repo-root-relative path. */
  path: string;
  /** "blob" (file) | "tree" (dir) | "commit" (submodule). */
  type: string;
  /** Size in bytes (blobs only). */
  size?: number;
}

/** Resolve the head commit SHA of a branch. */
export async function getBranchHeadSha(
  installationId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

/**
 * The full recursive git tree at a commit/ref. GitHub truncates very large
 * trees (`truncated: true`); the caller's file cap means a truncated tree is
 * still usable — we just won't see every path.
 */
export async function getRepoTree(
  installationId: number,
  owner: string,
  repo: string,
  sha: string
): Promise<{ entries: RepoTreeEntry[]; truncated: boolean }> {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "1",
  });
  const entries: RepoTreeEntry[] = (data.tree ?? [])
    .filter((e): e is typeof e & { path: string; type: string } => Boolean(e.path && e.type))
    .map((e) => ({ path: e.path, type: e.type, size: e.size }));
  return { entries, truncated: Boolean(data.truncated) };
}

/** Read a file's UTF-8 source at a ref. Returns null on missing/binary/oversize. */
export async function getFileContentAtRef(
  installationId: number,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const octokit = await getInstallationOctokit(installationId);
  try {
    const res = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    const data = res.data as { content?: string; encoding?: string };
    if (!data.content) return null;
    const encoding: BufferEncoding = data.encoding === "base64" ? "base64" : "utf8";
    return Buffer.from(data.content, encoding).toString("utf8");
  } catch {
    return null;
  }
}

export interface InstallationRepoInfo {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string | null;
}

/** Every repo an installation can access (the "available to connect" set, plan 01). */
export async function listInstallationRepos(installationId: number): Promise<InstallationRepoInfo[]> {
  const octokit = await getInstallationOctokit(installationId);
  const repos = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
    per_page: 100,
  });
  // octokit types paginate loosely here; map defensively.
  return (repos as unknown as Array<{
    id: number;
    name: string;
    full_name: string;
    default_branch?: string;
    private?: boolean;
    language?: string | null;
  }>).map((r) => ({
    githubId: r.id,
    owner: r.full_name.split("/")[0],
    name: r.name,
    fullName: r.full_name,
    defaultBranch: r.default_branch ?? "main",
    isPrivate: r.private ?? false,
    language: r.language ?? null,
  }));
}

export interface OpenPrSummary {
  number: number;
  title: string;
  body: string | null;
  author: string;
  headSha: string;
  headRef: string;
  baseRef: string;
  htmlUrl: string;
}

export interface PrChangedFile {
  filename: string;
  status: string; // added | modified | removed | renamed | ...
  patch?: string; // unified diff hunk text (absent for binary / very large)
  additions: number;
  deletions: number;
}

/** Changed files of a PR with their unified-diff patches (for LLM analysis). */
export async function getPrChangedFiles(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrChangedFile[]> {
  const octokit = await getInstallationOctokit(installationId);
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch,
    additions: f.additions,
    deletions: f.deletions,
  }));
}

/** Current head SHA of a PR — used to skip posting a stale (superseded) analysis. */
export async function getPrHeadSha(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string | null> {
  try {
    const octokit = await getInstallationOctokit(installationId);
    const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
    return data.head.sha;
  } catch {
    return null;
  }
}

/** List OPEN pull requests of a repo (for backfill once an Overview is READY). */
export async function listOpenPullRequests(
  installationId: number,
  owner: string,
  repo: string
): Promise<OpenPrSummary[]> {
  const octokit = await getInstallationOctokit(installationId);
  const prs = await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  return prs.map((pr) => ({
    number: pr.number,
    title: pr.title ?? `PR #${pr.number}`,
    body: pr.body ?? null,
    author: pr.user?.login ?? "unknown",
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    htmlUrl: pr.html_url,
  }));
}
