// SeverityBadge is the ONLY place severity colors are defined.
// Never hardcode severity colors anywhere else.

import { useTranslations } from "next-intl";
import type { Severity } from "@/types";

const SEVERITY_STYLE: Record<Severity, { label: string; bg: string; color: string; border: string }> = {
  error: {
    label: "High",
    bg: "#FEF2F2",
    color: "#B42318",
    border: "#FECDCA",
  },
  warning: {
    label: "Medium",
    bg: "#FFFBEB",
    color: "#B54708",
    border: "#FEDF89",
  },
  info: {
    label: "Low",
    bg: "#EFF6FF",
    color: "#1D4ED8",
    border: "#BFDBFE",
  },
};

const SEVERITY_LABEL_KEY: Record<Severity, string> = {
  error: "high",
  warning: "medium",
  info: "low",
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: "sev-high",
  warning: "sev-med",
  info: "sev-low",
};

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const t = useTranslations("severity");
  return (
    <span className={`badge ${SEVERITY_CLASS[severity]} ${className}`}>
      {t(SEVERITY_LABEL_KEY[severity])}
    </span>
  );
}

export { SEVERITY_STYLE };
