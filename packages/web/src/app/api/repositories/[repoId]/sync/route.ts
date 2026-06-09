import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getGitHubToken, createOctokit } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { repoId } = await params;
  const repo = await getRepository(repoId, session.user.id);
  if (!repo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found" } }, { status: 404 });
  }

  const token = await getGitHubToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: { code: "NO_TOKEN", message: "GitHub token not found" } }, { status: 401 });
  }

  try {
    const octokit = createOctokit(token);
    const { data: prs } = await octokit.pulls.list({
      owner: repo.owner,
      repo: repo.name,
      state: "open",
      per_page: 50,
    });

    for (const pr of prs) {
      await prisma.pullRequest.upsert({
        where: { repositoryId_prNumber: { repositoryId: repo.id, prNumber: pr.number } },
        create: {
          repositoryId: repo.id,
          prNumber: pr.number,
          title: pr.title,
          body: pr.body ?? null,
          state: "OPEN",
          author: pr.user?.login ?? "unknown",
          sourceBranch: pr.head.ref,
          targetBranch: pr.base.ref,
          commitSha: pr.head.sha,
          githubUrl: pr.html_url,
        },
        update: { commitSha: pr.head.sha, updatedAt: new Date() },
      });
    }

    return NextResponse.json({ data: { synced: prs.length } });
  } catch (e: unknown) {
    return NextResponse.json({ error: { code: "GITHUB_ERROR", message: String(e) } }, { status: 500 });
  }
}
