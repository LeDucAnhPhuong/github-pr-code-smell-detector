import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstallationOctokit } from "@/lib/github-app";
import {
  upsertInstallation,
  connectInstallationRepos,
  type InstallationRepo,
} from "@/lib/db/installations";

/**
 * GitHub redirects here after a user installs (or updates) the GitHub App.
 *   GET /api/github/setup?installation_id=123&setup_action=install&state=<token>
 * We link the installation to the signed-in user and import its repositories.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const installationId = Number(url.searchParams.get("installation_id"));

  // Behind the Traefik proxy, req.url resolves to the internal bind address
  // (0.0.0.0:3000), so url.origin would build broken redirects. Use the public
  // base URL from AUTH_URL, falling back to the request origin for local dev.
  const base = process.env.AUTH_URL || url.origin;

  const session = await auth();
  if (!session?.user?.id) {
    // Not signed in — send to login, then back here.
    const back = encodeURIComponent(url.pathname + url.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${back}`, base));
  }

  if (!installationId) {
    return NextResponse.redirect(new URL("/repositories?error=missing_installation", base));
  }

  try {
    const octokit = await getInstallationOctokit(installationId);

    // List repos the installation can access (paginated).
    const repos: InstallationRepo[] = [];
    let accountLogin = "unknown";
    let accountType = "User";
    let page = 1;
    for (;;) {
      const res = await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
        page,
      });
      for (const r of res.data.repositories) {
        repos.push({
          githubId: r.id,
          owner: r.owner.login,
          name: r.name,
          fullName: r.full_name,
          defaultBranch: r.default_branch,
          isPrivate: r.private,
          language: r.language ?? null,
        });
        accountLogin = r.owner.login;
        accountType = r.owner.type ?? "User";
      }
      if (res.data.repositories.length < 100) break;
      page++;
    }

    await upsertInstallation({
      installationId,
      accountLogin,
      accountType,
      userId: session.user.id,
    });
    await connectInstallationRepos(session.user.id, installationId, repos);

    return NextResponse.redirect(new URL("/repositories?installed=1", base));
  } catch {
    return NextResponse.redirect(new URL("/repositories?error=setup_failed", base));
  }
}
