import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { analysisQueue } from "@/lib/queue";
import { checkQuota } from "@/lib/db/billing";

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

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";

  // Verify webhook signature
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!webhookSecret || !verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" } },
      { status: 401 }
    );
  }

  // Only handle pull_request events
  if (event !== "pull_request") {
    return NextResponse.json({ data: { ignored: true } }, { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 });
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

  // Find repository in DB
  const dbRepo = await prisma.repository.findFirst({
    where: { fullName },
    include: { user: true },
  });

  if (!dbRepo) {
    return NextResponse.json({ data: { ignored: true, reason: "repository not connected" } }, { status: 200 });
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

  // Create analysis record
  const analysis = await prisma.prAnalysis.create({
    data: {
      pullRequestId: dbPr.id,
      status: "PENDING",
      commitSha,
    },
  });

  // Enqueue BullMQ job
  await analysisQueue.add("analyze-pr", {
    prAnalysisId: analysis.id,
    repoId: dbRepo.id,
    prNumber,
    commitSha,
    installationId: installation?.id ?? 0,
  });

  // Return 202 immediately — do not await job
  return NextResponse.json({ data: { analysisId: analysis.id } }, { status: 202 });
}
