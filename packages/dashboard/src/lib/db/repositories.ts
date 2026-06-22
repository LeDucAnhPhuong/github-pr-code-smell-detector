import { prisma } from "@/lib/prisma";

export async function getRepositories(userId: string) {
  return prisma.repository.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      pullRequests: {
        where: { state: "OPEN" },
        select: { id: true },
      },
    },
  });
}

export async function getRepository(id: string, userId: string) {
  return prisma.repository.findFirst({
    where: { id, userId },
  });
}

/** The Project Overview for a repo the user owns (or null). */
export async function getProjectOverview(repoId: string, userId: string) {
  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId },
    select: { id: true },
  });
  if (!repo) return null;
  return prisma.projectOverview.findUnique({ where: { repositoryId: repoId } });
}

export async function getRepositoryByFullName(fullName: string, userId: string) {
  return prisma.repository.findFirst({
    where: { fullName, userId },
  });
}

export async function createRepository(
  userId: string,
  data: {
    githubId: number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch?: string;
    isPrivate?: boolean;
    language?: string;
  }
) {
  return prisma.repository.create({
    data: { userId, ...data },
  });
}

export async function updateRepositoryConfig(id: string, userId: string, config: object) {
  return prisma.repository.updateMany({
    where: { id, userId },
    data: { config },
  });
}

export async function deleteRepository(id: string, userId: string) {
  return prisma.repository.deleteMany({
    where: { id, userId },
  });
}
