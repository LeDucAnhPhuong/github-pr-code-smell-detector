import { prisma } from "@/lib/prisma";

export async function getReports(userId: string, repositoryId?: string) {
  return prisma.analysisReport.findMany({
    where: {
      prAnalysis: {
        pullRequest: {
          repository: { userId, ...(repositoryId && { id: repositoryId }) },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      prAnalysis: {
        include: {
          pullRequest: { include: { repository: { select: { fullName: true } } } },
          findings: { select: { severity: true } },
        },
      },
    },
  });
}

export async function getReport(id: string, userId: string) {
  return prisma.analysisReport.findFirst({
    where: {
      id,
      prAnalysis: { pullRequest: { repository: { userId } } },
    },
    include: {
      prAnalysis: {
        include: {
          pullRequest: { include: { repository: true } },
          findings: { select: { severity: true } },
        },
      },
    },
  });
}
