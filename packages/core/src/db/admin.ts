import { prisma } from "../prisma";
import type { Severity } from "../types";

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

// ─── Create / Delete (admin CRUD) ───────────────────────────────────────────
// NOTE: Rules are intentionally NOT created/deleted from admin (managed by users
// in a future flow). Only Category / Framework / Plan get full CRUD here.

// Thrown when a delete is blocked by existing references (FK Restrict).
export class ReferenceConstraintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceConstraintError";
  }
}

// Categories
export async function createCategory(data: {
  name: string;
  description?: string;
  defaultSeverity?: Severity;
  isActive?: boolean;
}) {
  return prisma.category.create({ data });
}

export async function deleteCategory(id: string) {
  const count = await prisma.rule.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new ReferenceConstraintError(
      `Không thể xóa: còn ${count} rule thuộc category này. Hãy tắt (deactivate) thay vì xóa.`
    );
  }
  return prisma.category.delete({ where: { id } });
}

// Frameworks
export async function createFramework(data: {
  name: string;
  supportedExtensions: string[];
  isActive?: boolean;
}) {
  return prisma.framework.create({ data });
}

export async function deleteFramework(id: string) {
  const count = await prisma.rule.count({ where: { frameworkId: id } });
  if (count > 0) {
    throw new ReferenceConstraintError(
      `Không thể xóa: còn ${count} rule thuộc framework này. Hãy tắt (deactivate) thay vì xóa.`
    );
  }
  return prisma.framework.delete({ where: { id } });
}

// Plans
export async function createPlan(data: {
  name: string;
  price: number;
  repositoryLimit: number;
  analysisQuota: number;
  hasCheckAnnotations?: boolean;
  hasHistoricalReports?: boolean;
  isActive?: boolean;
}) {
  return prisma.subscriptionPlan.create({ data });
}

export async function deletePlan(id: string) {
  const count = await prisma.tenantSubscription.count({ where: { planId: id } });
  if (count > 0) {
    throw new ReferenceConstraintError(
      `Không thể xóa: còn ${count} subscription đang dùng gói này. Hãy tắt (deactivate) thay vì xóa.`
    );
  }
  return prisma.subscriptionPlan.delete({ where: { id } });
}
