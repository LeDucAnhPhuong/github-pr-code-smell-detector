import { auth } from "@/lib/auth";
import { getSubscription, getUsage } from "@/lib/db/billing";
import Link from "next/link";
import { AlertTriangle, CreditCard, Gauge, GitBranch, BarChart } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function BillingPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, usage, t, tSubStatus] = await Promise.all([
    getSubscription(userId),
    getUsage(userId),
    getTranslations("billing"),
    getTranslations("subscriptionStatus"),
  ]);

  const planName = subscription?.plan.name ?? "Free";
  const repoLimit = subscription?.plan.repositoryLimit ?? 3;
  const analysisQuota = subscription?.plan.analysisQuota ?? 30;
  const analysisUsed = usage?.analysisCount ?? 0;
  const repoUsed = usage?.repositoryCount ?? 0;
  const quotaPercent = Math.round((analysisUsed / analysisQuota) * 100);
  const isOverQuota = quotaPercent >= 80;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="h1" style={{ marginBottom: 20 }}>{t("title")}</h1>

      {/* Quota warning */}
      {isOverQuota && (
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 mb-6"
          style={{ backgroundColor: "var(--color-severity-medium-bg)", borderColor: "var(--color-severity-medium-text)", borderRadius: "var(--radius-card)" }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {t("quotaWarning", { percent: quotaPercent })}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {t.rich("quotaWarningCta", {
                link: (chunks) => (
                  <Link href="/billing/plans" className="underline" style={{ color: "var(--color-primary)" }}>{chunks}</Link>
                ),
              })}
            </p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div
        className="rounded-lg border p-5 mb-6"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>{t("currentPlan")}</div>
            <div className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{planName}</div>
            <span
              className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
              style={{
                backgroundColor: subscription?.status === "ACTIVE" ? "#e6f4ea" : "#ffebe9",
                color: subscription?.status === "ACTIVE" ? "#1a7f37" : "#cf222e",
                borderRadius: "var(--radius-badge)",
              }}
            >
              {subscription ? tSubStatus(subscription.status) : t("noSubscription")}
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/billing/plans" className="btn btn-primary btn-sm">
              {t("changePlan")}
            </Link>
          </div>
        </div>

        {/* Quota meters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>{t("analysisQuota")}</span>
              <span>{analysisUsed} / {analysisQuota}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-muted)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(quotaPercent, 100)}%`,
                  backgroundColor: isOverQuota ? "var(--color-danger)" : "var(--accent)",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>{t("repositories")}</span>
              <span>{repoUsed} / {repoLimit}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-muted)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(Math.round((repoUsed / repoLimit) * 100), 100)}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
          </div>
        </div>

        {subscription?.renewalDate && (
          <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>
            {t("renews", { date: new Date(subscription.renewalDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) })}
          </p>
        )}
      </div>

      {/* Usage cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t("analysesThisMonth"), value: analysisUsed, icon: BarChart },
          { label: t("repositories"), value: repoUsed, icon: GitBranch },
          { label: t("reportsGenerated"), value: usage?.reportCount ?? 0, icon: CreditCard },
          { label: t("quotaUsed"), value: `${quotaPercent}%`, icon: Gauge },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border p-4"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
            </div>
            <div className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {[
          { href: "/billing/plans", label: t("viewPlans") },
          { href: "/billing/subscription", label: t("subscriptionDetails") },
          { href: "/billing/usage", label: t("usageHistory") },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="btn btn-secondary btn-sm">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
