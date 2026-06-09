import { auth } from "@/lib/auth";
import { getGitHubToken, createOctokit } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const token = await getGitHubToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: { code: "NO_TOKEN", message: "GitHub token not found" } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  try {
    const octokit = createOctokit(token);
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 30,
      sort: "updated",
      type: "all",
    });

    const repos = data
      .filter((r) => !q || r.full_name.toLowerCase().includes(q.toLowerCase()))
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        private: r.private,
        language: r.language ?? null,
      }));

    return NextResponse.json({ data: repos });
  } catch (e: unknown) {
    return NextResponse.json({ error: { code: "GITHUB_ERROR", message: String(e) } }, { status: 500 });
  }
}
