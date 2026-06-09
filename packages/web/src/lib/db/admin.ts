import { prisma } from "@/lib/prisma";
import type { Severity } from "@/types";

// Rules (no userId guard — admin-managed global)
export async function getRules(frameworkId?: string, categoryId?: string) {
  return prisma.rule.findMany({
    where: {
      ...(frameworkId && { frameworkId }),
      ...(categoryId && { categoryId }),
    },
    orderBy: { id: "asc" },
    include: { framework: true, category: true },
  });
}

export async function createRule(data: {
  id: string;
  name: string;
  description: string;
  whyItMatters: string;
  frameworkId: string;
  categoryId: string;
  defaultSeverity: Severity;
  defaultThreshold?: number;
}) {
  return prisma.rule.create({ data });
}

export async function updateRule(id: string, data: Partial<{
  name: string;
  description: string;
  whyItMatters: string;
  defaultSeverity: Severity;
  defaultThreshold: number | null;
  isActive: boolean;
}>) {
  return prisma.rule.update({ where: { id }, data });
}

// Frameworks
export async function getFrameworks() {
  return prisma.framework.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { rules: true } } },
  });
}

export async function updateFramework(id: string, data: { isActive?: boolean; supportedExtensions?: string[] }) {
  return prisma.framework.update({ where: { id }, data });
}

// Categories
export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { rules: true } } },
  });
}

export async function updateCategory(id: string, data: { isActive?: boolean; defaultSeverity?: Severity; description?: string }) {
  return prisma.category.update({ where: { id }, data });
}

// Plans
export async function getPlansAdmin() {
  return prisma.subscriptionPlan.findMany({ orderBy: { repositoryLimit: "asc" } });
}

export async function updatePlan(id: string, data: Partial<{
  name: string;
  price: number;
  repositoryLimit: number;
  analysisQuota: number;
  hasCheckAnnotations: boolean;
  hasHistoricalReports: boolean;
  isActive: boolean;
}>) {
  return prisma.subscriptionPlan.update({ where: { id }, data });
}
