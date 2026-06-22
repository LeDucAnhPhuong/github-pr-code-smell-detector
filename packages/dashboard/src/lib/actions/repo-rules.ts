"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRuleMarkdown } from "@/lib/rules/parse-rule";
import { revalidatePath } from "next/cache";

/** Confirm the repo belongs to the signed-in user; returns userId or null. */
async function authorizeRepo(repoId: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId: session.user.id },
    select: { id: true },
  });
  return repo ? session.user.id : null;
}

export interface RuleActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Create a custom rule from raw markdown (frontmatter parsed into columns). */
export async function createRepoRule(repoId: string, markdown: string): Promise<RuleActionResult> {
  if (!(await authorizeRepo(repoId))) return { ok: false, error: "Unauthorized" };
  let parsed;
  try {
    parsed = parseRuleMarkdown(markdown);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const rule = await prisma.repoRule.create({
    data: {
      repositoryId: repoId,
      title: parsed.title,
      severity: parsed.severity,
      appliesTo: parsed.appliesTo,
      bodyMd: parsed.bodyMd,
    },
  });
  revalidatePath(`/repositories/${repoId}/config/rules`);
  return { ok: true, id: rule.id };
}

/** Update a custom rule; bumps version and re-parses frontmatter. */
export async function updateRepoRule(repoId: string, ruleId: string, markdown: string): Promise<RuleActionResult> {
  if (!(await authorizeRepo(repoId))) return { ok: false, error: "Unauthorized" };
  let parsed;
  try {
    parsed = parseRuleMarkdown(markdown);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await prisma.repoRule.updateMany({
    where: { id: ruleId, repositoryId: repoId },
    data: {
      title: parsed.title,
      severity: parsed.severity,
      appliesTo: parsed.appliesTo,
      bodyMd: parsed.bodyMd,
      version: { increment: 1 },
    },
  });
  revalidatePath(`/repositories/${repoId}/config/rules`);
  return { ok: true, id: ruleId };
}

export async function deleteRepoRule(repoId: string, ruleId: string): Promise<RuleActionResult> {
  if (!(await authorizeRepo(repoId))) return { ok: false, error: "Unauthorized" };
  await prisma.repoRule.deleteMany({ where: { id: ruleId, repositoryId: repoId } });
  revalidatePath(`/repositories/${repoId}/config/rules`);
  return { ok: true };
}

export async function toggleRepoRule(repoId: string, ruleId: string, isActive: boolean): Promise<RuleActionResult> {
  if (!(await authorizeRepo(repoId))) return { ok: false, error: "Unauthorized" };
  await prisma.repoRule.updateMany({ where: { id: ruleId, repositoryId: repoId }, data: { isActive } });
  revalidatePath(`/repositories/${repoId}/config/rules`);
  return { ok: true };
}

/** Enable/disable a built-in system rule for this repo (stored in config.rules). */
export async function toggleSystemRule(repoId: string, systemRuleId: string, enabled: boolean): Promise<RuleActionResult> {
  if (!(await authorizeRepo(repoId))) return { ok: false, error: "Unauthorized" };
  const repo = await prisma.repository.findUnique({ where: { id: repoId }, select: { config: true } });
  const config = (repo?.config as Record<string, unknown>) ?? {};
  const rules = (config.rules as Record<string, { enabled?: boolean }>) ?? {};
  rules[systemRuleId] = { ...rules[systemRuleId], enabled };
  await prisma.repository.update({
    where: { id: repoId },
    data: { config: { ...config, rules } },
  });
  revalidatePath(`/repositories/${repoId}/config/rules`);
  return { ok: true };
}
