"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AnalysisStatus } from "@/types";

interface AnalysisStatusPollerProps {
  analysisId: string;
  initialStatus: AnalysisStatus;
  onComplete?: (status: AnalysisStatus) => void;
}

const STATUS_DOT: Record<AnalysisStatus, string> = {
  COMPLETED: "var(--ok-dot)",
  RUNNING: "var(--run-dot)",
  FAILED: "var(--fail-dot)",
  PENDING: "var(--idle-dot)",
};

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const t = useTranslations("status");
  return (
    <span className="status" style={{ fontSize: 13 }}>
      <span
        className={`dot ${status === "RUNNING" ? "animate-pulse" : ""}`}
        style={{ background: STATUS_DOT[status] }}
      />
      {t(status)}
    </span>
  );
}

export function AnalysisStatusPoller({ analysisId, initialStatus, onComplete }: AnalysisStatusPollerProps) {
  const [status, setStatus] = useState<AnalysisStatus>(initialStatus);

  useEffect(() => {
    if (status !== "RUNNING" && status !== "PENDING") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/status`);
        const json = await res.json();
        if (json.data?.status) {
          const newStatus = json.data.status as AnalysisStatus;
          setStatus(newStatus);
          if (newStatus === "COMPLETED" || newStatus === "FAILED") {
            clearInterval(interval);
            onComplete?.(newStatus);
            // Reload page to show full results
            if (newStatus === "COMPLETED") {
              window.location.reload();
            }
          }
        }
      } catch {
        // Silently retry
      }
    }, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [analysisId, status, onComplete]);

  return <AnalysisStatusBadge status={status} />;
}
