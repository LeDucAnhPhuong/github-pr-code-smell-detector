import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

/** Collect every leaf key path (objects recursed, arrays treated as leaves). */
function leafKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message catalogs", () => {
  const enKeys = leafKeys(en).sort();
  const viKeys = leafKeys(vi).sort();

  it("vi has every key that en has", () => {
    const missing = enKeys.filter((k) => !viKeys.includes(k));
    expect(missing, `Missing in vi.json: ${missing.join(", ")}`).toEqual([]);
  });

  it("en has every key that vi has", () => {
    const extra = viKeys.filter((k) => !enKeys.includes(k));
    expect(extra, `Extra in vi.json (missing in en.json): ${extra.join(", ")}`).toEqual([]);
  });

  it("has no empty string values", () => {
    const empties = leafKeys(en).filter((path) => {
      const value = path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], en);
      return value === "";
    });
    expect(empties, `Empty values in en.json: ${empties.join(", ")}`).toEqual([]);
  });
});
