/**
 * Render the single consolidated PR comment (plan 04, phase 1 = one summary
 * comment, not inline). Includes the analyzer MARKER so upsertPrComment can
 * find & edit it in place.
 */

import { MARKER } from "github-pr-code-smell-detector";
import type { NormalizedFinding, Severity } from "./analysis";

const EMOJI: Record<Severity, string> = { error: "⛔", warning: "⚠️", info: "ℹ️" };

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export interface RenderPrCommentInput {
  summary: string;
  qualityScore: number;
  qualityReasoning: string;
  findings: NormalizedFinding[];
  commitSha: string;
  truncated: boolean;
}

export function renderPrComment(input: RenderPrCommentInput): string {
  const lines: string[] = [];
  lines.push(MARKER);
  lines.push("");
  lines.push(`**Summary:** ${input.summary}`);
  lines.push("");
  lines.push(
    `**Quality Score:** ${input.qualityScore}/5${input.qualityReasoning ? ` — ${input.qualityReasoning}` : ""}`
  );
  lines.push("");

  if (input.findings.length === 0) {
    lines.push("✅ No rule violations found in the changed files.");
  } else {
    lines.push("**Rule violations**");
    // Most severe first.
    const order: Severity[] = ["error", "warning", "info"];
    const sorted = [...input.findings].sort(
      (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity)
    );
    for (const f of sorted) {
      const tag = f.source === "custom" ? "[Custom]" : "[System]";
      const loc = f.lineStart != null ? `${f.filePath}:${f.lineStart}` : f.filePath;
      const fix = f.suggestion ? ` → ${f.suggestion}` : "";
      lines.push(`- ${EMOJI[f.severity]} ${tag} ${f.ruleName} — ${loc} — ${f.message}${fix}`);
    }
  }

  if (input.truncated) {
    lines.push("");
    lines.push("> ⚠️ The diff was large and partially truncated; some changes may not be fully analyzed.");
  }

  lines.push("");
  lines.push(`<sub>Analyzed commit ${shortSha(input.commitSha)}</sub>`);
  return lines.join("\n");
}
