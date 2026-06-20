import { prisma } from "@/lib/prisma";
import type { Severity } from "@/types";

export async function getFindings(
  prAnalysisId: string,
  userId: string,
  filters?: { severity?: Severity; ruleId?: string; filePath?: string }
) {
  return prisma.finding.findMany({
    where: {
      prAnalysisId,
      prAnalysis: { pullRequest: { repository: { userId } } },
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.ruleId && { ruleId: filters.ruleId }),
      ...(filters?.filePath && { filePath: { contains: filters.filePath } }),
    },
    orderBy: [{ severity: "asc" }, { filePath: "asc" }, { lineStart: "asc" }],
    include: { rule: { include: { category: { select: { name: true } }, framework: { select: { name: true } } } } },
  });
}

export async function getFinding(id: string, userId: string) {
  return prisma.finding.findFirst({
    where: {
      id,
      prAnalysis: { pullRequest: { repository: { userId } } },
    },
    include: {
      rule: {
        include: {
          category: { select: { name: true } },
          framework: { select: { name: true } },
        },
      },
      prAnalysis: {
        include: {
          pullRequest: { include: { repository: true } },
        },
      },
    },
  });
}

export async function getHighSeverityFindings(userId: string, limit = 5) {
  return prisma.finding.findMany({
    where: {
      severity: "error",
      prAnalysis: { pullRequest: { repository: { userId } } },
      status: "OPEN",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      prAnalysis: {
        include: {
          pullRequest: { include: { repository: { select: { fullName: true } } } },
        },
      },
    },
  });
}
