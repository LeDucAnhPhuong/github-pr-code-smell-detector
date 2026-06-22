import { describe, it, expect } from "vitest";
import {
  clusterByDirectory,
  parseReduceOutput,
  condenseOverview,
  mapWithConcurrency,
  type FileWithContent,
} from "@/lib/overview/prompts";

describe("clusterByDirectory", () => {
  it("groups files by directory at depth <= 2 with a (root) bucket", () => {
    const files: FileWithContent[] = [
      { path: "package.json", content: "{}" },
      { path: "src/index.ts", content: "x" },
      { path: "src/components/Button.tsx", content: "y" },
      { path: "src/components/Modal.tsx", content: "z" },
    ];
    const clusters = clusterByDirectory(files);
    const dirs = clusters.map((c) => c.dir);
    expect(dirs).toContain("(root)");
    expect(dirs).toContain("src");
    expect(dirs).toContain("src/components");
    const components = clusters.find((c) => c.dir === "src/components");
    expect(components?.files).toHaveLength(2);
  });
});

describe("parseReduceOutput", () => {
  it("validates and coerces a well-formed object", () => {
    const { summaryMd, metadata } = parseReduceOutput({
      summaryMd: "# Project\nDetails",
      metadata: {
        stack: ["TypeScript", "Next.js", "  "],
        architecture: ["monorepo"],
        modules: [{ name: "dashboard", description: "web UI" }, "core", { description: "no name" }],
        conventions: ["server actions"],
        domain: ["PR analysis"],
        dependencies: ["prisma"],
      },
    });
    expect(summaryMd).toContain("Project");
    expect(metadata.stack).toEqual(["TypeScript", "Next.js"]); // blank dropped
    expect(metadata.modules).toEqual([
      { name: "dashboard", description: "web UI" },
      { name: "core", description: "" }, // string coerced
    ]);
  });

  it("defaults missing metadata keys to empty arrays", () => {
    const { metadata } = parseReduceOutput({ summaryMd: "x" });
    expect(metadata.stack).toEqual([]);
    expect(metadata.modules).toEqual([]);
    expect(metadata.dependencies).toEqual([]);
  });

  it("throws when summaryMd is missing", () => {
    expect(() => parseReduceOutput({ metadata: {} })).toThrow();
    expect(() => parseReduceOutput("nope")).toThrow();
  });
});

describe("condenseOverview", () => {
  it("renders only populated fields", () => {
    const out = condenseOverview({
      stack: ["TS"],
      architecture: [],
      modules: [{ name: "core", description: "" }],
      conventions: ["x"],
      domain: [],
      dependencies: [],
    });
    expect(out).toContain("Stack: TS");
    expect(out).toContain("Modules: core");
    expect(out).toContain("Conventions: x");
    expect(out).not.toContain("Architecture");
    expect(out).not.toContain("Domain");
  });
});

describe("mapWithConcurrency", () => {
  it("preserves order and respects the concurrency cap", async () => {
    let active = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6];
    const results = await mapWithConcurrency(items, 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(results).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
