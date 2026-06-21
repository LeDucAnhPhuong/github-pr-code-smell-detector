"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, X, ShieldAlert } from "lucide-react";
import {
  type PermissionStatus,
  missingSignature,
} from "@/lib/github-permissions";

const DISMISS_KEY = "perm-alert-dismissed";

// Minimal external store so the dismissed flag is read straight from
// localStorage (client-only, no hydration mismatch, no setState-in-effect) and
// the toast re-renders the moment the user dismisses it in this same tab.
const listeners = new Set<() => void>();

function subscribeDismissed(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function setDismissedSignature(signature: string) {
  localStorage.setItem(DISMISS_KEY, signature);
  listeners.forEach((cb) => cb());
}

interface PermissionAlertProps {
  missing: PermissionStatus[];
}

export function PermissionAlert({ missing }: PermissionAlertProps) {
  const t = useTranslations("permissionAlert");
  const signature = useMemo(() => missingSignature(missing), [missing]);
  const hasCritical = missing.some((p) => p.severity === "critical");
  const [modalOpen, setModalOpen] = useState(false);

  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    () => localStorage.getItem(DISMISS_KEY) === signature,
    () => true, // server snapshot: stay hidden until the client decides
  );

  if (missing.length === 0 || dismissed) {
    return null;
  }

  function handleDismiss() {
    setDismissedSignature(signature);
    setModalOpen(false);
  }

  const accent = hasCritical ? "var(--color-danger)" : "var(--color-warning)";
  const accentBg = hasCritical
    ? "var(--color-severity-high-bg)"
    : "var(--color-severity-medium-bg)";

  const headline = hasCritical
    ? t("headlineCritical")
    : t("headlineWarning");

  return (
    <>
      {/* Persistent toast — bottom-right, shown on every dashboard page */}
      <div
        className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg"
        style={{
          backgroundColor: accentBg,
          borderColor: accent,
          borderRadius: "var(--radius-card)",
          maxWidth: 340,
        }}
        role="status"
      >
        {hasCritical ? (
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: accent }} />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: accent }} />
        )}
        <div className="min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {headline}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("countNotGranted", { count: missing.length })}{" "}
            <button
              onClick={() => setModalOpen(true)}
              className="underline font-medium"
              style={{ color: accent }}
            >
              {t("details")}
            </button>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label={t("dismissAria")}
          className="shrink-0 self-start transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Detail modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="relative w-full max-w-lg rounded-lg border shadow-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              borderRadius: "var(--radius-card)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <ShieldAlert className="w-4 h-4" style={{ color: accent }} />
                {t("modalTitle")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label={t("closeAria")}
                className="transition-colors hover:opacity-70"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("bodyIntro")}
              </p>

              {missing.map((p) => (
                <MissingPermissionRow key={`${p.label}-${p.scope}`} perm={p} />
              ))}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-3 px-5 py-4 border-t"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Link
                href="/account"
                onClick={() => setModalOpen(false)}
                className="text-xs underline"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("manageInAccount")}
              </Link>
              <div className="flex items-center gap-3">
                <button onClick={handleDismiss} className="btn btn-secondary btn-sm">
                  {t("dismiss")}
                </button>
                <form action="/api/auth/signin/github" method="POST">
                  <input type="hidden" name="callbackUrl" value="/account" />
                  <button type="submit" className="btn btn-primary btn-sm">
                    {t("reauthorize")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MissingPermissionRow({ perm }: { perm: PermissionStatus }) {
  const t = useTranslations("permissionAlert");
  const isCritical = perm.severity === "critical";
  const rowAccent = isCritical ? "var(--color-danger)" : "var(--color-warning)";
  const rowBg = isCritical
    ? "var(--color-severity-high-bg)"
    : "var(--color-severity-medium-bg)";

  return (
    <div
      className="flex items-start gap-3 rounded-md border px-3 py-2.5"
      style={{
        borderColor: "var(--color-border)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {perm.label}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: rowBg,
              color: rowAccent,
              borderRadius: "var(--radius-badge)",
            }}
          >
            {isCritical ? t("required") : t("optional")}
          </span>
        </div>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {perm.impact}
        </p>
      </div>
    </div>
  );
}
