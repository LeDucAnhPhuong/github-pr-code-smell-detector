import { describe, it, expect } from "vitest";
import { generateOrderCode, extractOrderCode, buildVietQrUrl } from "@/lib/sepay";

describe("generateOrderCode", () => {
  it("produces an MT-prefixed, 10-char, bank-memo-safe code", () => {
    const code = generateOrderCode();
    expect(code).toMatch(/^MT[A-Z0-9]{8}$/);
    expect(code).toHaveLength(10);
  });

  it("is reasonably unique across many calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateOrderCode()));
    expect(set.size).toBeGreaterThan(990);
  });
});

describe("extractOrderCode", () => {
  it("reads the SePay-parsed code field first", () => {
    expect(extractOrderCode("MTABCD1234", "noise", "")).toBe("MTABCD1234");
  });

  it("falls back to scanning the free-text content", () => {
    expect(extractOrderCode(null, "thanh toan goi pro MTXYZ98765 cam on")).toBe("MTXYZ98765");
  });

  it("is case-insensitive against lowercased bank descriptions", () => {
    expect(extractOrderCode(null, "ck mtabcd1234")).toBe("MTABCD1234");
  });

  it("returns null when no code is present", () => {
    expect(extractOrderCode(null, "chuyen tien an trua", "")).toBeNull();
  });

  it("ignores codes with the wrong length", () => {
    expect(extractOrderCode(null, "MTAB12")).toBeNull();
  });
});

describe("buildVietQrUrl", () => {
  it("embeds the amount and transfer memo", () => {
    const url = buildVietQrUrl(199000, "MTABCD1234");
    expect(url).toContain("qr.sepay.vn/img");
    expect(url).toContain("amount=199000");
    expect(url).toContain("des=MTABCD1234");
  });
});
