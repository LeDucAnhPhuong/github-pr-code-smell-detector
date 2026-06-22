"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstallationsByUser } from "@/lib/db/installations";
import { listInstallationRepos } from "@/lib/github-app";
import { detectFramework } from "@/lib/connect/detect-framework";
import { enqueueOverview } from "@/lib/queue";
import { revalidatePath } from "next/cache";

// Repo states that count against the plan's repositoryLimit.
const ACTIVE_STATES = ["READY", "INDEXING", "DETECTING"] as const;

export interface ConnectableRepo {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string | null;
  installationId: number;
  connectionState: string | null; // null = not connected yet
}

/** List every repo the user's installations can access, flagged with connect state. */
export async function listConnectableRepos(): Promise<ConnectableRepo[]> {
  const session = await auth();
  if (!session?.user) return [];
  const userId = session.user.id;

  const installations = await getInstallationsByUser(userId);
  const connected = await prisma.repository.findMany({
    where: { userId },
    select: { fullName: true, connectionState: true },
  });
  const stateByFullName = new Map(connected.map((r) => [r.fullName, r.connectionState as string]));

  const out: ConnectableRepo[] = [];
  for (const inst of installations) {
    if (inst.suspendedAt) continue;
    let repos;
    try {
      repos = await listInstallationRepos(inst.installationId);
    } catch (e) {
      console.warn(`[connect] list repos failed for installation ${inst.installationId}:`, (e as Error).message);
      continue;
    }
    for (const r of repos) {
      out.push({
        ...r,
        installationId: inst.installationId,
        connectionState: stateByFullName.get(r.fullName) ?? null,
      });
    }
  }
  return out;
}

export interface ConnectResult {
  ok: boolean;
  code?: "UNAUTHENTICATED" | "NO_CONSENT" | "LIMIT_REACHED" | "UNSUPPORTED_FRAMEWORK" | "NOT_AVAILABLE" | "ERROR";
  message?: string;
  framework?: string;
}

/**
 * Connect a single repo: consent → enforce repositoryLimit → detect framework
 * (reject if unsupported) → create the Repository as INDEXING and enqueue the
 * Overview index (which backfills open PRs once READY). No row is created on
 * rejection.
 */
export async function connectRepository(input: {
  githubId: number;
  installationId: number;
  consent: boolean;
}): Promise<ConnectResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "UNAUTHENTICATED" };
  const userId = session.user.id;

  if (!input.consent) {
    return { ok: false, code: "NO_CONSENT", message: "Consent is required to connect a repository." };
  }

  // Locate the repo within the installation's accessible set (authoritative).
  let repoInfo;
  try {
    const repos = await listInstallationRepos(input.installationId);
    repoInfo = repos.find((r) => r.githubId === input.githubId);
  } catch (e) {
    return { ok: false, code: "ERROR", message: (e as Error).message };
  }
  if (!repoInfo) return { ok: false, code: "NOT_AVAILABLE", message: "Repository is not accessible by the app." };

  // Enforce repositoryLimit (skip if this repo is already connected/active).
  const existing = await prisma.repository.findUnique({
    where: { userId_fullName: { userId, fullName: repoInfo.fullName } },
    select: { id: true, connectionState: true },
  });
  const alreadyActive = existing && ACTIVE_STATES.includes(existing.connectionState as (typeof ACTIVE_STATES)[number]);
  if (!alreadyActive) {
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const limit = subscription?.plan.repositoryLimit ?? 0;
    const activeCount = await prisma.repository.count({
      where: { userId, connectionState: { in: [...ACTIVE_STATES] } },
    });
    if (activeCount >= limit) {
      return {
        ok: false,
        code: "LIMIT_REACHED",
        message: `Repository limit reached (${activeCount}/${limit}). Upgrade your plan or disconnect another repo.`,
      };
    }
  }

  // Detect framework (cheap, no LLM). No match → reject, create nothing.
  const match = await detectFramework(
    input.installationId,
    repoInfo.owner,
    repoInfo.name,
    repoInfo.defaultBranch
  );
  if (!match) {
    return {
      ok: false,
      code: "UNSUPPORTED_FRAMEWORK",
      message: "This repository's framework is not supported yet (Phase 1 supports React/JS-TS).",
    };
  }

  // Create/connect the repo as INDEXING, record consent, enqueue overview.
  const repo = await prisma.repository.upsert({
    where: { userId_fullName: { userId, fullName: repoInfo.fullName } },
    create: {
      userId,
      githubId: repoInfo.githubId,
      owner: repoInfo.owner,
      name: repoInfo.name,
      fullName: repoInfo.fullName,
      defaultBranch: repoInfo.defaultBranch,
      isPrivate: repoInfo.isPrivate,
      language: repoInfo.language,
      installationId: input.installationId,
      connectionState: "INDEXING",
      frameworkId: match.frameworkId,
      consentedAt: new Date(),
      rejectedReason: null,
    },
    update: {
      installationId: input.installationId,
      defaultBranch: repoInfo.defaultBranch,
      connectionState: "INDEXING",
      frameworkId: match.frameworkId,
      consentedAt: new Date(),
      rejectedReason: null,
    },
  });

  try {
    await enqueueOverview({ repositoryId: repo.id, installationId: input.installationId, backfill: true });
  } catch (e) {
    console.warn(`[connect] enqueue overview failed for ${repoInfo.fullName}:`, (e as Error).message);
  }

  revalidatePath("/repositories");
  return { ok: true, framework: match.frameworkName };
}

/** Disconnect a repo: removes it from limit counting and stops PR analysis. */
export async function disconnectRepository(repoId: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  await prisma.repository.deleteMany({ where: { id: repoId, userId: session.user.id } });
  revalidatePath("/repositories");
  return { ok: true };
}

/**
 * Reactivate a SUSPENDED repo if the user is under their plan limit. Re-indexes
 * the overview so the repo returns to READY (plan 01 — user picks which to keep).
 */
export async function reactivateRepository(repoId: string): Promise<ConnectResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, code: "UNAUTHENTICATED" };
  const userId = session.user.id;

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId },
    select: { id: true, connectionState: true, installationId: true },
  });
  if (!repo) return { ok: false, code: "NOT_AVAILABLE" };
  if (repo.connectionState !== "SUSPENDED") return { ok: true };

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  const limit = subscription?.plan.repositoryLimit ?? 0;
  const activeCount = await prisma.repository.count({
    where: { userId, connectionState: { in: [...ACTIVE_STATES] } },
  });
  if (activeCount >= limit) {
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: `Repository limit reached (${activeCount}/${limit}). Disconnect another repo first.`,
    };
  }

  await prisma.repository.update({ where: { id: repoId }, data: { connectionState: "INDEXING" } });
  if (repo.installationId) {
    try {
      await enqueueOverview({ repositoryId: repoId, installationId: repo.installationId, backfill: true });
    } catch (e) {
      console.warn(`[connect] reactivate enqueue failed:`, (e as Error).message);
    }
  }
  revalidatePath("/repositories");
  return { ok: true };
}

/**
 * Downgrade enforcement: if a user's active repo count exceeds their plan limit,
 * SUSPEND the excess (newest first kept; oldest suspended). UI can later let the
 * user pick which to keep. SUSPENDED repos stop receiving PR events (plan 01).
 */
export async function suspendExcessRepositories(userId: string): Promise<number> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  const limit = subscription?.plan.repositoryLimit ?? 0;
  const active = await prisma.repository.findMany({
    where: { userId, connectionState: { in: [...ACTIVE_STATES] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (active.length <= limit) return 0;
  const toSuspend = active.slice(limit).map((r) => r.id);
  await prisma.repository.updateMany({
    where: { id: { in: toSuspend } },
    data: { connectionState: "SUSPENDED" },
  });
  return toSuspend.length;
}
