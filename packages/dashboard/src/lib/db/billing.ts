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
