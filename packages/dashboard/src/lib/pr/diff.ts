/**
 * Unified-diff helpers for PR analysis (plan 04). Annotates a GitHub `patch`
 * with real new-file line numbers so the LLM can cite exact lines, and exposes
 * the set of valid added-line numbers so we can reject lines the LLM invents
 * (map → hunk → file-level fallback). Pure + dependency-free.
 */

export interface AnnotatedDiff {
  /** Human/LLM-readable diff with `<lineNo> | <content>` and [ADDED] markers. */
  text: string;
  /** New-file line numbers that were ADDED in this patch (valid inline targets). */
  addedLines: Set<number>;
  /** True if we truncated the patch to stay under the line budget. */
  truncated: boolean;
}

const MAX_DIFF_LINES = Number(process.env.PR_MAX_DIFF_LINES ?? 400);

/**
 * Parse a unified-diff hunk patch. For each `@@ -a,b +c,d @@` hunk we walk lines,
 * tracking the new-file line counter: context (' ') and added ('+') lines consume
 * a new-file number; removed ('-') lines do not.
 */
export function annotateDiff(patch: string | undefined, maxLines = MAX_DIFF_LINES): AnnotatedDiff {
  const addedLines = new Set<number>();
  if (!patch) return { text: "", addedLines, truncated: false };

  const out: string[] = [];
  let newLine = 0;
  let emitted = 0;
  let truncated = false;

  for (const line of patch.split("\n")) {
    if (emitted >= maxLines) {
      truncated = true;
      break;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      out.push(line);
      emitted++;
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines.add(newLine);
      out.push(`${String(newLine).padStart(5)} | ${line.slice(1)}   // [ADDED]`);
      newLine++;
      emitted++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // removed line — no new-file number
      out.push(`      | ${line.slice(1)}   // [REMOVED]`);
      emitted++;
    } else if (line.startsWith("\\")) {
      // "\ No newline at end of file"
      out.push(`      | ${line}`);
      emitted++;
    } else {
      // context line
      const content = line.startsWith(" ") ? line.slice(1) : line;
      out.push(`${String(newLine).padStart(5)} | ${content}`);
      newLine++;
      emitted++;
    }
  }

  return { text: out.join("\n"), addedLines, truncated };
}

/**
 * Validate a finding's line against the diff: keep it inline if the line was
 * ADDED in this patch; otherwise drop it to a file-level finding (null line).
 */
export function resolveFindingLine(
  lineStart: number | null | undefined,
  addedLines: Set<number>
): number | null {
  if (lineStart == null) return null;
  return addedLines.has(lineStart) ? lineStart : null;
}
