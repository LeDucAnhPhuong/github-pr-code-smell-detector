import { prisma } from "../prisma";
import type { AnalysisStatus } from "../types";

export async function getAdminStats() {
  const [users, repositories, analyses, activePlans, findings] = await Promise.all([
    prisma.user.count(),
    prisma.repository.count(),
    prisma.prAnalysis.count(),
    prisma.subscriptionPlan.count({ where: { isActive: true } }),
    prisma.finding.count(),
  ]);
  return { users, repositories, analyses, activePlans, findings };
}

// Count of analyses grouped by status (PENDING / RUNNING / COMPLETED / FAILED).
export async function getAnalysisStatusCounts(): Promise<Record<AnalysisStatus, number>> {
  const rows = await prisma.prAnalysis.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const result: Record<AnalysisStatus, number> = {
    PENDING: 0,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
  for (const row of rows) {
    result[row.status as AnalysisStatus] = row._count._all;
  }
  return result;
}

export async function getRecentAnalyses(limit = 8) {
  return prisma.prAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      createdAt: true,
      pullRequest: {
        select: {
          prNumber: true,
          title: true,
          repository: { select: { fullName: true } },
        },
      },
    },
  });
}
