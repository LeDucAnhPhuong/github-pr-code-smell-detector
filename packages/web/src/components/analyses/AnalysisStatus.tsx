"use client";

import { useEffect, useState } from "react";
import type { AnalysisStatus } from "@/types";

interface AnalysisStatusPollerProps {
  analysisId: string;
  initialStatus: AnalysisStatus;
  onComplete?: (status: AnalysisStatus) => void;
}

const STATUS_STYLE: Record<AnalysisStatus, { bg: string; color: string }> = {
  COMPLETED: { bg: "#e6f4ea", color: "#1a7f37" },
  RUNNING: { bg: "#ddf4ff", color: "#0969da" },
  FAILED: { bg: "#ffebe9", color: "#cf222e" },
  PENDING: { bg: "#f0f3f6", color: "#57606a" },
};

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: "var(--radius-badge)" }}
    >
      {status === "RUNNING" && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.color }} />
      )}
      {status.charAt(0) + status.slice(1).toLowerCase()}
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
