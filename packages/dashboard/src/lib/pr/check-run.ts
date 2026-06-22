/**
 * Publish a GitHub Check run with inline annotations for plans that include the
 * check-annotations perk (plan 04 / plan.hasCheckAnnotations). Built from our
 * combined system+custom findings; findings without a resolvable line are
 * counted in the summary but not annotated.
 */

import { getInstallationOctokit } from "@/lib/github-app";
import type { NormalizedFinding, Severity } from "./analysis";

const CHECK_NAME = "Code Smell Detector";
const BATCH_SIZE = 50; // GitHub limit: 50 annotations per request

function annotationLevel(sev: Severity): "failure" | "warning" | "notice" {
  if (sev === "error") return "failure";
  if (sev === "warning") return "warning";
  return "notice";
}

export async function publishCheckRun(
  installationId: number,
  owner: string,
  repo: string,
  sha: string,
  findings: NormalizedFinding[],
  blocking: boolean
): Promise<void> {
  const octokit = await getInstallationOctokit(installationId);

  const annotations = findings
    .filter((f) => f.lineStart != null)
    .map((f) => ({
      path: f.filePath,
      start_line: f.lineStart as number,
      end_line: f.lineStart as number,
      annotation_level: annotationLevel(f.severity),
      title: `${f.source === "custom" ? "[Custom] " : "[System] "}${f.ruleName}`,
      message: f.suggestion ? `${f.message}\n\nSuggested fix: ${f.suggestion}` : f.message,
    }));

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const hasBlocking = blocking && errorCount > 0;
  const conclusion = hasBlocking ? "failure" : "success";
  const summary =
    findings.length === 0
      ? "No findings detected in the changed files."
      : `${findings.length} finding(s): ${errorCount} error, ${findings.filter((f) => f.severity === "warning").length} warning`;

  try {
    const checkRun = await octokit.rest.checks.create({
      owner,
      repo,
      name: CHECK_NAME,
      head_sha: sha,
      status: "completed",
      conclusion,
      output: { title: "Code Smell Analysis", summary, annotations: annotations.slice(0, BATCH_SIZE) },
    });
    for (let i = BATCH_SIZE; i < annotations.length; i += BATCH_SIZE) {
      await octokit.rest.checks.update({
        owner,
        repo,
        check_run_id: checkRun.data.id,
        output: { title: "Code Smell Analysis", summary, annotations: annotations.slice(i, i + BATCH_SIZE) },
      });
    }
  } catch (e) {
    // checks:write may be missing — don't fail the analysis over annotations.
    console.warn(`[pr] Failed to publish Check run: ${(e as Error).message}`);
  }
}
