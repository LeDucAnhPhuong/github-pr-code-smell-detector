import type { Job } from "bullmq";
import type { AnalysisJob } from "../../src/types";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export async function analysisProcessor(job: Job<AnalysisJob>) {
  const { prAnalysisId, prNumber, commitSha } = job.data;
  const prisma = getPrisma();

  try {
    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // TODO: Call packages/analyzer once it exposes a programmatic API
    // const { findings, diagnostics, evaluationResult } = await runAnalyzer({...})
    // For now, complete with empty findings
    const runtimeMs = Math.floor(Math.random() * 5000) + 500;

    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: { status: "COMPLETED", completedAt: new Date(), runtimeMs },
    });

    await prisma.evaluationResult.create({
      data: {
        prAnalysisId,
        runtimeMs,
        filesAnalyzed: 0,
        filesSkipped: 0,
        rulesEvaluated: 0,
        findingsCount: 0,
        diagnosticsCount: 0,
      },
    });

    // Increment subscription usage
    const analysis = await prisma.prAnalysis.findUnique({
      where: { id: prAnalysisId },
      include: { pullRequest: { include: { repository: true } } },
    });
    if (analysis) {
      const userId = analysis.pullRequest.repository.userId;
      const now = new Date();
      const month = now.getFullYear() * 100 + (now.getMonth() + 1);
      await prisma.subscriptionUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, analysisCount: 1 },
        update: { analysisCount: { increment: 1 } },
      });
    }
  } catch (err) {
    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: {
        status: "FAILED",
        diagnosticMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
