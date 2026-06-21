import { prisma } from "../prisma";
import type { UserRole } from "../types";

// List all users with repo count and current subscription plan.
export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { repositories: true } },
      subscription: {
        select: {
          status: true,
          plan: { select: { name: true } },
        },
      },
    },
  });
}

export async function getUserDetail(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      subscriptionUsages: { orderBy: { month: "desc" } },
      _count: { select: { repositories: true } },
    },
  });
}

export async function updateUserRole(id: string, role: UserRole) {
  return prisma.user.update({ where: { id }, data: { role } });
}
