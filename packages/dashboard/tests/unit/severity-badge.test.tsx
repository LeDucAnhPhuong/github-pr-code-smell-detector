import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge, SEVERITY_STYLE } from "@/components/findings/SeverityBadge";

describe("SeverityBadge", () => {
  it("renders High label for error severity", () => {
    render(<SeverityBadge severity="error" />);
    expect(screen.getByText("High")).toBeDefined();
  });

  it("renders Medium label for warning severity", () => {
    render(<SeverityBadge severity="warning" />);
    expect(screen.getByText("Medium")).toBeDefined();
  });

  it("renders Low label for info severity", () => {
    render(<SeverityBadge severity="info" />);
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
