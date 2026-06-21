"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Copy, Clock } from "lucide-react";

type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

interface Props {
  orderId: string;
  initialStatus: OrderStatus;
  expiresAt: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("checkoutClient");
  const [copied, setCopied] = useState(false);
  return (
    <div className="between" style={{ alignItems: "center", gap: 12 }}>
      <div>
        <div className="muted" style={{ fontSize: 11 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>{value}</div>
      </div>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Copy className="w-3.5 h-3.5" /> {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}

export function CheckoutClient({ orderId, initialStatus, expiresAt }: Props) {
  const router = useRouter();
  const t = useTranslations("checkoutClient");
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  // Poll order status every 4s until settled.
  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        const next = body.data.status as OrderStatus;
        if (next !== status) setStatus(next);
      } catch {
        /* transient — keep polling */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [orderId, status]);

  // Countdown timer.
  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Redirect shortly after success so the user sees the confirmation.
  useEffect(() => {
    if (status === "PAID") {
      const timer = setTimeout(() => {
        router.push("/billing");
        router.refresh();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  if (status === "PAID") {
    return (
      <div className="card card-body stack" style={{ alignItems: "center", textAlign: "center", gap: 12, padding: 40 }}>
        <CheckCircle2 className="w-12 h-12" style={{ color: "var(--ok-ink, #1a7f37)" }} />
        <h2 className="h2">{t("paidTitle")}</h2>
        <p className="secondary">{t("paidDesc")}</p>
      </div>
    );
  }

  if (status === "EXPIRED" || status === "FAILED") {
    return (
      <div className="card card-body stack" style={{ alignItems: "center", textAlign: "center", gap: 12, padding: 40 }}>
        <Clock className="w-12 h-12" style={{ color: "var(--color-danger, #cf222e)" }} />
        <h2 className="h2">{status === "EXPIRED" ? t("expiredTitle") : t("failedTitle")}</h2>
        <p className="secondary">{t("retryDesc")}</p>
        <button className="btn btn-primary btn-sm" onClick={() => router.push("/billing/plans")}>
          {t("chooseAgain")}
        </button>
      </div>
    );
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="row" style={{ gap: 8, alignItems: "center", color: "var(--ink-2)", fontSize: 13 }}>
      <Clock className="w-4 h-4" />
      <span>{t("waiting", { time: `${mm}:${ss}` })}</span>
    </div>
  );
}

export { CopyField };
