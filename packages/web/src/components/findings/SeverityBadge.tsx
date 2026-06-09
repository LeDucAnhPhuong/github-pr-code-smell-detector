// SeverityBadge is the ONLY place severity colors are defined.
// Never hardcode severity colors anywhere else.

import type { Severity } from "@/types";

const SEVERITY_STYLE: Record<Severity, { label: string; bg: string; color: string; border: string }> = {
  error: {
    label: "High",
    bg: "#FFEBE9",
    color: "#CF222E",
    border: "#f1aeb5",
  },
  warning: {
    label: "Medium",
    bg: "#FFF8C5",
    color: "#9A6700",
    border: "#e9c46a",
  },
  info: {
    label: "Low",
    bg: "#DDF4FF",
    color: "#0969DA",
    border: "#a5d6f7",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: "var(--radius-badge)",
      }}
    >
      {style.label}
    </span>
  );
}

export { SEVERITY_STYLE };
