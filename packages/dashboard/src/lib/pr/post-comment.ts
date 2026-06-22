/**
 * Upsert the single consolidated PR comment via the installation token (plan 04).
 * Finds the prior comment by the analyzer MARKER and edits it in place; returns
 * the GitHub comment id so we can store it for next time.
 */

import { MARKER } from "github-pr-code-smell-detector";
import { getInstallationOctokit } from "@/lib/github-app";

export async function upsertPrComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<number> {
  const octokit = await getInstallationOctokit(installationId);
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    return existing.id;
  }
  const created = await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
  return created.data.id;
}
