import { describe, it, expect } from "vitest";
import { parseRuleMarkdown } from "@/lib/rules/parse-rule";
import { globToRegExp, matchesGlob, matchesAnyGlob } from "@/lib/rules/glob";
import { filterCustomRulesByPaths, disabledSystemRuleIds } from "@/lib/rules/select-rules";

describe("parseRuleMarkdown", () => {
  const valid = `---
title: No direct DB access in UI components
severity: error
appliesTo:
  - "src/ui/**"
  - "**/*.tsx"
---

Body text here.
**Why:** separation.`;

  it("parses frontmatter + keeps raw body as source of truth", () => {
    const r = parseRuleMarkdown(valid);
    expect(r.title).toBe("No direct DB access in UI components");
    expect(r.severity).toBe("error");
    expect(r.appliesTo).toEqual(["src/ui/**", "**/*.tsx"]);
    expect(r.bodyMd).toBe(valid); // raw preserved
  });

  it("supports inline appliesTo lists", () => {
    const r = parseRuleMarkdown(`---\ntitle: X\nseverity: warning\nappliesTo: ["a/**", "b.ts"]\n---\nbody`);
    expect(r.appliesTo).toEqual(["a/**", "b.ts"]);
  });

  it("defaults severity to warning and treats missing appliesTo as global", () => {
    const r = parseRuleMarkdown(`---\ntitle: Y\n---\nbody`);
    expect(r.severity).toBe("warning");
    expect(r.appliesTo).toEqual([]);
  });

  it("rejects missing frontmatter, missing title, bad severity, empty body", () => {
    expect(() => parseRuleMarkdown("just text")).toThrow();
    expect(() => parseRuleMarkdown(`---\nseverity: error\n---\nbody`)).toThrow(/title/);
    expect(() => parseRuleMarkdown(`---\ntitle: A\nseverity: huge\n---\nbody`)).toThrow(/severity/i);
    expect(() => parseRuleMarkdown(`---\ntitle: A\n---\n   `)).toThrow(/body/i);
  });
});

describe("glob", () => {
  it("** crosses path separators, * does not", () => {
    expect(matchesGlob("src/ui/Button.tsx", "src/**")).toBe(true);
    expect(matchesGlob("src/ui/Button.tsx", "src/*")).toBe(false);
    expect(matchesGlob("src/Button.tsx", "src/*")).toBe(true);
    expect(matchesGlob("a/b/c.tsx", "**/*.tsx")).toBe(true);
    expect(matchesGlob("a/b/c.ts", "**/*.tsx")).toBe(false);
  });

  it("escapes regex metacharacters in literals", () => {
    expect(globToRegExp("a.b").test("axb")).toBe(false);
    expect(globToRegExp("a.b").test("a.b")).toBe(true);
  });

  it("matchesAnyGlob returns false for empty list", () => {
    expect(matchesAnyGlob("x.ts", [])).toBe(false);
  });
});

describe("filterCustomRulesByPaths", () => {
  const rules = [
    { id: "1", isActive: true, appliesTo: ["src/ui/**"] },
    { id: "2", isActive: true, appliesTo: [] }, // global
    { id: "3", isActive: false, appliesTo: [] }, // inactive
    { id: "4", isActive: true, appliesTo: ["**/*.css"] },
  ];

  it("keeps global + path-matching active rules; drops inactive and non-matching", () => {
    const kept = filterCustomRulesByPaths(rules, ["src/ui/Button.tsx"]).map((r) => r.id);
    expect(kept).toContain("1"); // ui glob matches
    expect(kept).toContain("2"); // global
    expect(kept).not.toContain("3"); // inactive
    expect(kept).not.toContain("4"); // css glob, no match
  });
});

describe("disabledSystemRuleIds", () => {
  it("reads both config shapes", () => {
    const ids = disabledSystemRuleIds({
      rules: { "react/keys": { enabled: false }, "react/hooks": { enabled: true } },
      disabledSystemRules: ["react/extra"],
    });
    expect(ids.has("react/keys")).toBe(true);
    expect(ids.has("react/hooks")).toBe(false);
    expect(ids.has("react/extra")).toBe(true);
  });
});
