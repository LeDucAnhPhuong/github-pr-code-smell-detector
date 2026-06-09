import { prisma } from "@/lib/prisma";
import type { AnalysisStatus } from "@/types";

export async function getAnalysis(id: string, userId: string) {
  return prisma.prAnalysis.findFirst({
    where: {
      id,
      pullRequest: { repository: { userId } },
    },
    include: {
      pullRequest: { include: { repository: true } },
      evaluationResult: true,
      analysisReport: true,
    },
  });
}

export async function getAnalysisStatus(id: string, userId: string) {
  return prisma.prAnalysis.findFirst({
    where: {
      id,
      pullRequest: { repository: { userId } },
    },
    select: { id: true, status: true, updatedAt: true },
  });
}

export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus,
  extra?: { diagnosticMessage?: string; runtimeMs?: number; startedAt?: Date; completedAt?: Date }
) {
  return prisma.prAnalysis.update({
    where: { id },
    data: { status, ...extra },
  });
}

export async function getRecentAnalyses(userId: string, limit = 10) {
  return prisma.prAnalysis.findMany({
    where: {
      pullRequest: { repository: { userId } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      pullRequest: {
        include: { repository: { select: { owner: true, name: true, fullName: true } } },
      },
      findings: { select: { severity: true } },
    },
  });
}

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = now.getFullYear() * 100 + (now.getMonth() + 1);

  const [repoCount, openPRCount, findingsThisWeek, subscription] = await Promise.all([
    prisma.repository.count({ where: { userId } }),
    prisma.pullRequest.count({
      where: { repository: { userId }, state: "OPEN" },
    }),
    prisma.finding.count({
      where: {
        prAnalysis: { pullRequest: { repository: { userId } }, createdAt: { gte: weekAgo } },
      },
    }),
    prisma.tenantSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
  ]);

  const usageRecord = await prisma.subscriptionUsage.findUnique({
    where: { userId_month: { userId, month: monthStr } },
  });

  const analysisQuota = subscription?.plan.analysisQuota ?? 30;
  const analysisUsed = usageRecord?.analysisCount ?? 0;
  const quotaPercent = Math.round((analysisUsed / analysisQuota) * 100);

  return { repoCount, openPRCount, findingsThisWeek, quotaPercent, analysisUsed, analysisQuota };
}
