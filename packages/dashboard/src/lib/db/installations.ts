import { prisma } from "@/lib/prisma";

export async function getInstallationsByUser(userId: string) {
  return prisma.githubInstallation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasInstallation(userId: string): Promise<boolean> {
  const count = await prisma.githubInstallation.count({ where: { userId } });
  return count > 0;
}

export async function findInstallation(installationId: number) {
  return prisma.githubInstallation.findUnique({ where: { installationId } });
}

export async function upsertInstallation(data: {
  installationId: number;
  accountLogin: string;
  accountType: string;
  userId?: string | null;
}) {
  return prisma.githubInstallation.upsert({
    where: { installationId: data.installationId },
    create: {
      installationId: data.installationId,
      accountLogin: data.accountLogin,
      accountType: data.accountType,
      userId: data.userId ?? null,
    },
    update: {
      accountLogin: data.accountLogin,
      accountType: data.accountType,
      // Only overwrite userId when a value is provided (webhook events have no user context).
      ...(data.userId ? { userId: data.userId } : {}),
      suspendedAt: null,
    },
  });
}

export async function suspendInstallation(installationId: number) {
  return prisma.githubInstallation.updateMany({
    where: { installationId },
    data: { suspendedAt: new Date() },
  });
}

export async function deleteInstallation(installationId: number) {
  return prisma.githubInstallation.deleteMany({ where: { installationId } });
}

export interface InstallationRepo {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  language?: string | null;
}

/** Upsert the repositories a user granted to an installation. Idempotent. */
export async function connectInstallationRepos(
  userId: string,
  installationId: number,
  repos: InstallationRepo[]
) {
  for (const r of repos) {
    await prisma.repository.upsert({
      where: { userId_fullName: { userId, fullName: r.fullName } },
      create: {
        userId,
        githubId: r.githubId,
        owner: r.owner,
        name: r.name,
        fullName: r.fullName,
        defaultBranch: r.defaultBranch ?? "main",
        isPrivate: r.isPrivate ?? false,
        language: r.language ?? null,
        installationId,
      },
      update: {
        installationId,
        defaultBranch: r.defaultBranch ?? "main",
        isPrivate: r.isPrivate ?? false,
        language: r.language ?? null,
      },
    });
  }
}

/** Remove repositories that an installation no longer has access to. */
export async function disconnectInstallationRepos(installationId: number, fullNames: string[]) {
  if (fullNames.length === 0) return;
  await prisma.repository.deleteMany({
    where: { installationId, fullName: { in: fullNames } },
  });
}
