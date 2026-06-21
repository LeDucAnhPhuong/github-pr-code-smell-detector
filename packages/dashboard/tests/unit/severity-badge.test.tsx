import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SeverityBadge, SEVERITY_STYLE } from "@/components/findings/SeverityBadge";
import enMessages from "@/messages/en.json";

function renderBadge(severity: "error" | "warning" | "info") {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <SeverityBadge severity={severity} />
    </NextIntlClientProvider>
  );
}

describe("SeverityBadge", () => {
  it("renders High label for error severity", () => {
    renderBadge("error");
    expect(screen.getByText("High")).toBeDefined();
  });

  it("renders Medium label for warning severity", () => {
    renderBadge("warning");
    expect(screen.getByText("Medium")).toBeDefined();
  });

  it("renders Low label for info severity", () => {
    renderBadge("info");
    expect(screen.getByText("Low")).toBeDefined();
  });

  it("uses correct colors for High severity", () => {
    expect(SEVERITY_STYLE.error.bg).toBe("#FEF2F2");
    expect(SEVERITY_STYLE.error.color).toBe("#B42318");
  });

  it("uses correct colors for Medium severity", () => {
    expect(SEVERITY_STYLE.warning.bg).toBe("#FFFBEB");
    expect(SEVERITY_STYLE.warning.color).toBe("#B54708");
  });

  it("uses correct colors for Low severity", () => {
    expect(SEVERITY_STYLE.info.bg).toBe("#EFF6FF");
    expect(SEVERITY_STYLE.info.color).toBe("#1D4ED8");
  });
});
