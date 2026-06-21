"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function UpgradeButton({ planId, label }: { planId: string; label: string }) {
  const router = useRouter();
  const t = useTranslations("upgradeButton");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? t("errorCreate"));
      }
      router.push(`/billing/checkout/${body.data.orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={handleUpgrade}
        disabled={loading}
      >
        {loading ? "Đang tạo đơn…" : label}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger, #cf222e)", marginTop: 8 }}>
          {error}
        </p>
      )}
    </>
  );
}
