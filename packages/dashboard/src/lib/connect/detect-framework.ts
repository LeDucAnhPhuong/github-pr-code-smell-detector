/**
 * Cheap, NO-LLM framework detection run synchronously at connect time (plan 01).
 * Reads the repo manifest via the installation token and matches it against the
 * active `Framework` rows. Phase 1 is JS/TS only (React); the marker map is
 * easily extended later.
 */

import { getFileContentAtRef, getBranchHeadSha } from "@/lib/github-app";
import { prisma } from "@/lib/prisma";

export interface FrameworkMatch {
  frameworkId: string;
  frameworkName: string;
}

/**
 * Dependency markers per framework name (lowercased). A repo's package.json must
 * contain at least one marker in deps/devDeps to match. Falls back to matching
 * the framework name itself as a dependency name.
 */
const MARKERS: Record<string, string[]> = {
  react: ["react", "react-dom"],
  vue: ["vue"],
  angular: ["@angular/core"],
  svelte: ["svelte"],
  next: ["next"],
};

function depNames(pkg: unknown): Set<string> {
  const names = new Set<string>();
  if (pkg && typeof pkg === "object") {
    const o = pkg as Record<string, unknown>;
    for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
      const deps = o[key];
      if (deps && typeof deps === "object") {
        for (const dep of Object.keys(deps as Record<string, unknown>)) names.add(dep.toLowerCase());
      }
    }
  }
  return names;
}

/**
 * Detect the framework of a repo's default branch. Returns the matching active
 * Framework, or null when none matches (caller rejects the connection).
 */
export async function detectFramework(
  installationId: number,
  owner: string,
  name: string,
  defaultBranch: string
): Promise<FrameworkMatch | null> {
  let sha: string;
  try {
    sha = await getBranchHeadSha(installationId, owner, name, defaultBranch);
  } catch {
    return null;
  }

  const raw = await getFileContentAtRef(installationId, owner, name, "package.json", sha);
  if (!raw) return null; // no JS/TS manifest → unsupported in Phase 1

  let pkg: unknown;
  try {
    pkg = JSON.parse(raw);
  } catch {
    return null;
  }
  const deps = depNames(pkg);
  if (deps.size === 0) return null;

  const frameworks = await prisma.framework.findMany({ where: { isActive: true } });
  for (const fw of frameworks) {
    const key = fw.name.toLowerCase();
    const markers = MARKERS[key] ?? [key];
    if (markers.some((m) => deps.has(m))) {
      return { frameworkId: fw.id, frameworkName: fw.name };
    }
  }
  return null;
}
