import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { checkQuota } from "@/lib/db/billing";
import { prisma } from "@/lib/prisma";
import { analysisQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { repoId } = await params;
  const repo = await getRepository(repoId, session.user.id);
  if (!repo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found" } }, { status: 404 });
  }

  const { prId } = await req.json();
  const pr = await prisma.pullRequest.findFirst({ where: { id: prId, repositoryId: repo.id } });
  if (!pr) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "PR not found" } }, { status: 404 });
  }

  const quotaCheck = await checkQuota(session.user.id);
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: { code: "QUOTA_EXCEEDED", message: "Analysis quota exceeded" } }, { status: 402 });
  }

  const analysis = await prisma.prAnalysis.create({
    data: { pullRequestId: pr.id, status: "PENDING", commitSha: pr.commitSha },
  });

  await analysisQueue.add("analyze-pr", {
    prAnalysisId: analysis.id,
    repoId: repo.id,
    prNumber: pr.prNumber,
    commitSha: pr.commitSha,
    installationId: repo.installationId ?? 0,
  });

  return NextResponse.json({ data: { analysisId: analysis.id } }, { status: 202 });
}
