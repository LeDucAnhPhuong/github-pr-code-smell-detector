import { describe, it, expect } from "vitest";
import {
  isExcluded,
  priority,
  selectIndexableFiles,
  type SelectableFile,
} from "@/lib/overview/file-filter";

describe("isExcluded", () => {
  it("drops dependency / build / vcs directories", () => {
    expect(isExcluded("node_modules/react/index.js")).toBe(true);
    expect(isExcluded("packages/web/dist/main.js")).toBe(true);
    expect(isExcluded("frontend/.next/static/x.js")).toBe(true);
    expect(isExcluded(".git/config")).toBe(true);
    expect(isExcluded("target/debug/app")).toBe(true);
  });

  it("drops lockfiles and generated/minified files", () => {
    expect(isExcluded("package-lock.json")).toBe(true);
    expect(isExcluded("pnpm-lock.yaml")).toBe(true);
    expect(isExcluded("public/app.min.js")).toBe(true);
    expect(isExcluded("dist/types/api.d.ts")).toBe(true);
    expect(isExcluded("src/__tests__/x.snap")).toBe(true);
  });

  it("drops binary / media / sourcemap extensions", () => {
    expect(isExcluded("assets/logo.png")).toBe(true);
    expect(isExcluded("fonts/Inter.woff2")).toBe(true);
    expect(isExcluded("build/main.js.map")).toBe(true);
  });

  it("keeps real source and manifests", () => {
    expect(isExcluded("package.json")).toBe(false);
    expect(isExcluded("src/index.ts")).toBe(false);
    expect(isExcluded("README.md")).toBe(false);
    expect(isExcluded("app/page.tsx")).toBe(false);
  });
});

describe("priority", () => {
  it("ranks manifests above entry points above src above the rest", () => {
    expect(priority("package.json")).toBeLessThan(priority("src/index.ts"));
    expect(priority("src/index.ts")).toBeLessThan(priority("src/util/deep/helper.ts"));
    expect(priority("src/util/deep/helper.ts")).toBeLessThan(priority("misc/notes/x.ts"));
  });
});

describe("selectIndexableFiles", () => {
  const files: SelectableFile[] = [
    { path: "package.json", size: 500 },
    { path: "src/index.ts", size: 1000 },
    { path: "src/big.ts", size: 10_000 },
    { path: "node_modules/x/index.js", size: 200 },
    { path: "huge.bin", size: 999_999 }, // excluded by ext anyway
  ];

  it("filters noise before capping", () => {
    const r = selectIndexableFiles(files, { maxFiles: 100, maxBytes: 1e9, maxFileBytes: 1e9 });
    const paths = r.selected.map((f) => f.path);
    expect(paths).toContain("package.json");
    expect(paths).toContain("src/index.ts");
    expect(paths).not.toContain("node_modules/x/index.js");
    expect(paths).not.toContain("huge.bin");
    expect(r.droppedFiltered).toBe(2);
  });

  it("skips files larger than maxFileBytes", () => {
    const r = selectIndexableFiles(files, { maxFiles: 100, maxBytes: 1e9, maxFileBytes: 5_000 });
    const paths = r.selected.map((f) => f.path);
    expect(paths).not.toContain("src/big.ts");
  });

  it("enforces the file-count cap keeping highest-priority files", () => {
    const r = selectIndexableFiles(files, { maxFiles: 1, maxBytes: 1e9, maxFileBytes: 1e9 });
    expect(r.selected).toHaveLength(1);
    expect(r.selected[0].path).toBe("package.json"); // manifest wins
    expect(r.droppedCap).toBeGreaterThan(0);
  });

  it("enforces the byte cap", () => {
    const r = selectIndexableFiles(files, { maxFiles: 100, maxBytes: 1200, maxFileBytes: 1e9 });
    const total = r.selected.reduce((s, f) => s + f.size, 0);
    expect(total).toBeLessThanOrEqual(1200);
  });
});
