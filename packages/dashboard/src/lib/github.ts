import { Octokit } from "@octokit/rest";

// Server-side only — never import this in client components
export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

// Get user's GitHub access token from the database session
export async function getGitHubToken(userId: string): Promise<string | null> {
  const { prisma } = await import("./prisma");
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  return account?.access_token ?? null;
}
