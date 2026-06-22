import { describe, it, expect } from "vitest";
import { annotateDiff, resolveFindingLine } from "@/lib/pr/diff";
import {
  validateMapOutput,
  validateReduceOutput,
  severityCeiling,
  clampScore,
  dedupeFindings,
  type NormalizedFinding,
} from "@/lib/pr/analysis";

const PATCH = `@@ -10,3 +10,4 @@ export function f() {
 const a = 1
-const b = 2
+const b = 3
+await prisma.user.findMany()
 return a`;

describe("annotateDiff", () => {
  it("numbers new-file lines and records added lines", () => {
    const d = annotateDiff(PATCH);
    // hunk starts new file at line 10: context(10), added(11), added(12), context(13)
    expect(d.addedLines.has(11)).toBe(true);
    expect(d.addedLines.has(12)).toBe(true);
    expect(d.addedLines.has(10)).toBe(false); // context
    expect(d.text).toContain("[ADDED]");
    expect(d.truncated).toBe(false);
  });

  it("truncates beyond the line budget", () => {
    const big = "@@ -1,1 +1,200 @@\n" + Array.from({ length: 200 }, (_, i) => `+line ${i}`).join("\n");
    const d = annotateDiff(big, 50);
    expect(d.truncated).toBe(true);
  });

  it("handles undefined patch", () => {
    expect(annotateDiff(undefined).addedLines.size).toBe(0);
  });
});

describe("resolveFindingLine", () => {
  it("keeps inline if added, else file-level (null)", () => {
    const added = new Set([11, 12]);
    expect(resolveFindingLine(11, added)).toBe(11);
    expect(resolveFindingLine(99, added)).toBeNull(); // LLM invented a line
    expect(resolveFindingLine(null, added)).toBeNull();
  });
});

describe("severityCeiling + clampScore", () => {
  it("ceiling: error=2, warning=4, clean=5", () => {
    expect(severityCeiling(["info", "error", "warning"])).toBe(2);
    expect(severityCeiling(["warning", "info"])).toBe(4);
    expect(severityCeiling(["info"])).toBe(5);
    expect(severityCeiling([])).toBe(5);
  });

  it("final score never exceeds the ceiling", () => {
    expect(clampScore(5, 2)).toBe(2);
    expect(clampScore(3, 4)).toBe(3);
    expect(clampScore(0, 5)).toBe(1); // floor at 1
  });
});

describe("validateMapOutput", () => {
  it("only accepts rule ids that were offered; coerces shapes", () => {
    const out = validateMapOutput(
      {
        note: "adds caching",
        violations: [
          { ruleId: "good", ruleName: "R", severity: "error", lineStart: 12, explanation: "x", suggestedFix: "y" },
          { ruleId: "spoofed", ruleName: "Z", severity: "nonsense", lineStart: -3, explanation: "", suggestedFix: "" },
        ],
      },
      new Set(["good"])
    );
    expect(out.note).toBe("adds caching");
    expect(out.violations[0].ruleId).toBe("good");
    expect(out.violations[1].ruleId).toBeNull(); // not in valid set
    expect(out.violations[1].severity).toBe("warning"); // coerced
    expect(out.violations[1].lineStart).toBeNull(); // invalid line
  });
});

describe("validateReduceOutput", () => {
  it("requires summary + score, clamps score to 1..5", () => {
    const r = validateReduceOutput({ summary: "ok", qualityScore: 9, qualityReasoning: "because" });
    expect(r.summary).toBe("ok");
    expect(r.qualityScore).toBe(5);
    expect(() => validateReduceOutput({ qualityScore: 3 })).toThrow();
    expect(() => validateReduceOutput({ summary: "x" })).toThrow();
  });
});

describe("dedupeFindings", () => {
  it("merges duplicates and prefers system over custom", () => {
    const findings: NormalizedFinding[] = [
      { source: "custom", ruleId: null, repoRuleId: "r1", ruleName: "Dup", severity: "warning", filePath: "a.ts", lineStart: 5, message: "m", suggestion: null },
      { source: "system", ruleId: "sys", repoRuleId: null, ruleName: "Dup", severity: "warning", filePath: "a.ts", lineStart: 5, message: "m", suggestion: null },
      { source: "custom", ruleId: null, repoRuleId: "r2", ruleName: "Other", severity: "error", filePath: "b.ts", lineStart: null, message: "m", suggestion: null },
    ];
    const out = dedupeFindings(findings);
    // a.ts:5 Dup merged → one, system wins
    const dup = out.filter((f) => f.filePath === "a.ts");
    expect(dup).toHaveLength(1);
    expect(dup[0].source).toBe("system");
    expect(out).toHaveLength(2);
  });
});
