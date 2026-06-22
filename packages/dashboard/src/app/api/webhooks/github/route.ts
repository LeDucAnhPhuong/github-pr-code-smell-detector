import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { enqueueAnalysis, enqueueOverview } from "@/lib/queue";
import { checkQuota } from "@/lib/db/billing";
import {
  upsertInstallation,
  deleteInstallation,
  suspendInstallation,
  findInstallation,
  connectInstallationRepos,
  disconnectInstallationRepos,
  type InstallationRepo,
} from "@/lib/db/installations";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

interface WebhookRepo {
  id: number;
  name: string;
  full_name: string;
  private?: boolean;
}

function mapWebhookRepos(repos: WebhookRepo[]): InstallationRepo[] {
  return repos.map((r) => ({
    githubId: r.id,
    owner: r.full_name.split("/")[0],
    name: r.name,
    fullName: r.full_name,
    isPrivate: r.private ?? false,
  }));
}

async function handleInstallationEvent(event: string, payload: Record<string, unknown>) {
  const action = payload.action as string;
  const installation = payload.installation as {
    id: number;
    account?: { login?: string; type?: string };
  };
  const installationId = installation.id;
  const accountLogin = installation.account?.login ?? "unknown";
  const accountType = installation.account?.type ?? "User";

  if (event === "installation") {
    if (action === "deleted") {
      await deleteInstallation(installationId);
      return;
    }
    if (action === "suspend") {
      await suspendInstallation(installationId);
      return;
    }
    // created | unsuspend | new_permissions_accepted
    await upsertInstallation({ installationId, accountLogin, accountType });
    const existing = await findInstallation(installationId);
    const repos = mapWebhookRepos((payload.repositories as WebhookRepo[]) ?? []);
    if (existing?.userId && repos.length > 0) {
      await connectInstallationRepos(existing.userId, installationId, repos);
    }
    return;
  }

  // installation_repositories: added | removed
  await upsertInstallation({ installationId, accountLogin, accountType });
  const existing = await findInstallation(installationId);
  const added = mapWebhookRepos((payload.repositories_added as WebhookRepo[]) ?? []);
  const removed = (payload.repositories_removed as WebhookRepo[]) ?? [];
  if (existing?.userId && added.length > 0) {
    await connectInstallationRepos(existing.userId, installationId, added);
  }
  if (removed.length > 0) {
    await disconnectInstallationRepos(installationId, removed.map((r) => r.full_name));
  }
}

/**
 * push event → auto re-index the Project Overview when the default branch moves
 * (plan 02). Debounced: a stable per-repo jobId + a short delay collapse bursty
 * pushes so only the newest SHA gets indexed. The old overview stays visible
 * (status READY) until the new one is built.
 */
async function handlePushEvent(payload: Record<string, unknown>) {
  const ref = payload.ref as string | undefined;
  const after = payload.after as string | undefined;
  const repo = payload.repository as Record<string, unknown> | undefined;
  const installation = payload.installation as { id: number } | undefined;
  if (!ref || !after || !repo || !installation) return;

  // Deleted branch / zero sha → nothing to index.
  if (/^0+$/.test(after)) return;

  const fullName = (repo.full_name as string) ?? "";
  const dbRepo = await prisma.repository.findFirst({
    where: { fullName, installationId: installation.id },
    include: { overview: { select: { indexedSha: true } } },
  });
  if (!dbRepo) return;

  // Only the user-selected default branch triggers a re-index.
  if (ref !== `refs/heads/${dbRepo.defaultBranch}`) return;

  // Already indexed at this commit → skip.
  if (dbRepo.overview?.indexedSha === after) return;

  const delayMs = Number(process.env.OVERVIEW_DEBOUNCE_MS ?? 30_000);
  await enqueueOverview({ repositoryId: dbRepo.id, installationId: installation.id, sha: after }, { delayMs });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";

  // Verify webhook signature (GitHub App webhook secret; falls back to legacy name)
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!webhookSecret || !verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" } },
      { status: 401 }
    );
  }

  // Handle pull_request + installation lifecycle + push (overview re-index) events
  if (
    event !== "pull_request" &&
    event !== "installation" &&
    event !== "installation_repositories" &&
    event !== "push"
  ) {
    return NextResponse.json({ data: { ignored: true } }, { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 });
  }

  if (event === "installation" || event === "installation_repositories") {
    await handleInstallationEvent(event, payload);
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  }

  if (event === "push") {
    await handlePushEvent(payload);
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  }

  const action = payload.action as string;
  if (!["opened", "synchronize", "reopened"].includes(action)) {
    return NextResponse.json({ data: { ignored: true } }, { status: 200 });
  }

  const pr = payload.pull_request as Record<string, unknown>;
  const repo = payload.repository as Record<string, unknown>;
  const installation = payload.installation as { id: number } | undefined;

  const fullName = (repo.full_name as string) ?? "";
  const prNumber = pr.number as number;
  const commitSha = (pr.head as { sha: string }).sha;

  // Find repository in DB (prefer matching the installation that sent the event)
  const dbRepo = await prisma.repository.findFirst({
    where: { fullName, ...(installation ? { installationId: installation.id } : {}) },
    include: { user: true },
  });

  if (!dbRepo) {
    return NextResponse.json({ data: { ignored: true, reason: "repository not connected" } }, { status: 200 });
  }

  // Guard (plan 01): only fully-connected, READY repos get PR analysis. Repos
  // that are DETECTING/INDEXING/REJECTED/INDEX_FAILED/SUSPENDED are ignored.
  if (dbRepo.connectionState !== "READY") {
    return NextResponse.json(
      { data: { ignored: true, reason: `repository not READY (${dbRepo.connectionState})` } },
      { status: 200 }
    );
  }

  // Skip draft PRs (plan 04 guard).
  if ((pr.draft as boolean | undefined) === true) {
    return NextResponse.json({ data: { ignored: true, reason: "draft PR" } }, { status: 200 });
  }

  const userId = dbRepo.userId;

  // Quota check
  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    // Create failed analysis to surface quota exceeded in UI
    const dbPr = await prisma.pullRequest.findFirst({
      where: { repositoryId: dbRepo.id, prNumber },
    });
    if (dbPr) {
      await prisma.prAnalysis.create({
        data: {
          pullRequestId: dbPr.id,
          status: "FAILED",
          commitSha,
          diagnosticMessage: "Quota exceeded. Upgrade your plan to continue analyzing PRs.",
        },
      });
    }
    return NextResponse.json(
      { error: { code: "QUOTA_EXCEEDED", message: "Analysis quota exceeded" } },
      { status: 402 }
    );
  }

  // Upsert PR record
  const dbPr = await prisma.pullRequest.upsert({
    where: { repositoryId_prNumber: { repositoryId: dbRepo.id, prNumber } },
    create: {
      repositoryId: dbRepo.id,
      prNumber,
      title: (pr.title as string) ?? `PR #${prNumber}`,
      body: (pr.body as string | null) ?? null,
      state: "OPEN",
      author: ((pr.user as { login: string })?.login) ?? "unknown",
      sourceBranch: (pr.head as { ref: string }).ref ?? "unknown",
      targetBranch: (pr.base as { ref: string }).ref ?? "main",
      commitSha,
      githubUrl: (pr.html_url as string) ?? "",
    },
    update: {
      commitSha,
      state: "OPEN",
      updatedAt: new Date(),
    },
  });

  // Supersede any prior not-yet-started analysis for this PR (debounce): a newer
  // push makes pending older-commit analyses obsolete.
  await prisma.prAnalysis.updateMany({
    where: { pullRequestId: dbPr.id, status: "PENDING" },
    data: { status: "FAILED", diagnosticMessage: "Superseded by a newer commit", completedAt: new Date() },
  });

  // Create analysis record
  const analysis = await prisma.prAnalysis.create({
    data: {
      pullRequestId: dbPr.id,
      status: "PENDING",
      commitSha,
    },
  });

  // Enqueue with a stable per-PR jobId so rapid pushes debounce to the latest.
  await enqueueAnalysis(dbPr.id, {
    prAnalysisId: analysis.id,
    repoId: dbRepo.id,
    prNumber,
    commitSha,
    installationId: installation?.id ?? 0,
  });

  // Return 202 immediately — do not await job
  return NextResponse.json({ data: { analysisId: analysis.id } }, { status: 202 });
}
