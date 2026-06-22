/**
 * Select the rules that apply to a PR's changed files (plan 03, consumed by 04).
 * System rules (AST) come from the repo's framework minus per-repo toggles;
 * custom rules (LLM) are filtered by their `appliesTo` globs against changed paths.
 */

import type { PrismaClient, Rule, RepoRule } from "@prisma/client";
import { matchesAnyGlob } from "./glob";

/** Pure: keep active custom rules that are global or match a changed path. */
export function filterCustomRulesByPaths<T extends { appliesTo: string[]; isActive: boolean }>(
  rules: T[],
  changedPaths: string[]
): T[] {
  return rules.filter((r) => {
    if (!r.isActive) return false;
    if (r.appliesTo.length === 0) return true; // global
    return changedPaths.some((p) => matchesAnyGlob(p, r.appliesTo));
  });
}

/** System rule ids the repo has toggled off, stored in Repository.config. */
export function disabledSystemRuleIds(config: unknown): Set<string> {
  const ids = new Set<string>();
  if (config && typeof config === "object") {
    const c = config as Record<string, unknown>;
    // legacy shape: { rules: { [id]: { enabled: false } } }
    const rules = c.rules as Record<string, { enabled?: boolean }> | undefined;
    if (rules) {
      for (const [id, v] of Object.entries(rules)) {
        if (v?.enabled === false) ids.add(id);
      }
    }
    // explicit list shape: { disabledSystemRules: string[] }
    const list = c.disabledSystemRules;
    if (Array.isArray(list)) for (const id of list) if (typeof id === "string") ids.add(id);
  }
  return ids;
}

export interface SelectedRules {
  systemRules: Rule[];
  customRules: RepoRule[];
}

/** Load + filter both rule sets for a repo against the PR's changed paths. */
export async function selectRulesForFiles(
  prisma: PrismaClient,
  repoId: string,
  changedPaths: string[]
): Promise<SelectedRules> {
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
    select: { frameworkId: true, config: true },
  });

  const disabled = disabledSystemRuleIds(repo?.config);
  const systemRules = (
    await prisma.rule.findMany({
      where: {
        isActive: true,
        ...(repo?.frameworkId ? { frameworkId: repo.frameworkId } : {}),
      },
    })
  ).filter((r) => !disabled.has(r.id));

  const allCustom = await prisma.repoRule.findMany({ where: { repositoryId: repoId, isActive: true } });
  const customRules = filterCustomRulesByPaths(allCustom, changedPaths);

  return { systemRules, customRules };
}
