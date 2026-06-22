import { describe, it, expect, afterEach } from "vitest";
import { maxTokensFor } from "@/lib/llm/openrouter";
import { isWithinTokenBudget } from "@/lib/billing/token-budget";

describe("isWithinTokenBudget", () => {
  it("treats quota 0 (or negative) as unlimited", () => {
    expect(isWithinTokenBudget(999_999_999, 0)).toBe(true);
    expect(isWithinTokenBudget(10, -1)).toBe(true);
  });

  it("allows while under quota, blocks at/over", () => {
    expect(isWithinTokenBudget(0, 100)).toBe(true);
    expect(isWithinTokenBudget(99, 100)).toBe(true);
    expect(isWithinTokenBudget(100, 100)).toBe(false);
    expect(isWithinTokenBudget(150, 100)).toBe(false);
  });
});

describe("maxTokensFor", () => {
  afterEach(() => {
    delete process.env.OPENROUTER_MAX_TOKENS;
  });

  it("returns sane defaults per purpose", () => {
    expect(maxTokensFor("overview_map")).toBe(512);
    expect(maxTokensFor("overview_reduce")).toBe(2000);
    expect(maxTokensFor("pr_map")).toBe(1500);
    expect(maxTokensFor("pr_reduce")).toBe(800);
  });

  it("honors OPENROUTER_MAX_TOKENS overrides, falls back on bad JSON", () => {
    process.env.OPENROUTER_MAX_TOKENS = JSON.stringify({ pr_reduce: 1200 });
    expect(maxTokensFor("pr_reduce")).toBe(1200);
    expect(maxTokensFor("pr_map")).toBe(1500); // unspecified → default

    process.env.OPENROUTER_MAX_TOKENS = "not json";
    expect(maxTokensFor("pr_reduce")).toBe(800);
  });
});
