import { prisma } from "@/lib/prisma";

export async function getSubscription(userId: string) {
  return prisma.tenantSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
}

export async function getUsage(userId: string) {
  const now = new Date();
  const month = now.getFullYear() * 100 + (now.getMonth() + 1);
  return prisma.subscriptionUsage.findUnique({
    where: { userId_month: { userId, month } },
  });
}

export async function getUsageHistory(userId: string, fromMonth?: number, toMonth?: number) {
  return prisma.subscriptionUsage.findMany({
    where: {
      userId,
      ...(fromMonth && { month: { gte: fromMonth } }),
      ...(toMonth && { month: { lte: toMonth } }),
    },
    orderBy: { month: "desc" },
  });
}

export async function checkQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    return { allowed: false, used: 0, limit: 0 };
  }

  const now = new Date();
  const month = now.getFullYear() * 100 + (now.getMonth() + 1);
  const usage = await prisma.subscriptionUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  const used = usage?.analysisCount ?? 0;
  const limit = subscription.plan.analysisQuota;

  return { allowed: used < limit, used, limit };
}

export async function incrementUsage(userId: string) {
  const now = new Date();
  const month = now.getFullYear() * 100 + (now.getMonth() + 1);
  await prisma.subscriptionUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, analysisCount: 1 },
    update: { analysisCount: { increment: 1 } },
  });
}

export async function getAllPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { repositoryLimit: "asc" },
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Activate or extend a user's subscription after a successful payment.
 * Renewal extends from the later of (now, current renewalDate) so paying early
 * stacks time rather than throwing it away. Idempotency is the caller's job
 * (guarded by the SePay transaction id on the PaymentOrder).
 */
export async function activateSubscription(userId: string, planId: string, months = 1) {
  const existing = await prisma.tenantSubscription.findUnique({ where: { userId } });
  const now = new Date();
  const base =
    existing?.renewalDate && existing.renewalDate > now ? existing.renewalDate : now;
  const renewalDate = addMonths(base, months);

  return prisma.tenantSubscription.upsert({
    where: { userId },
    create: { userId, planId, status: "ACTIVE", startDate: now, renewalDate },
    update: { planId, status: "ACTIVE", renewalDate, canceledAt: null },
  });
}
