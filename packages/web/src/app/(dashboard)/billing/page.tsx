import { auth } from "@/lib/auth";
import { getSubscription, getUsage } from "@/lib/db/billing";
import Link from "next/link";
import { AlertTriangle, CreditCard, Gauge, GitBranch, BarChart } from "lucide-react";

export default async function BillingPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, usage] = await Promise.all([getSubscription(userId), getUsage(userId)]);

  const planName = subscription?.plan.name ?? "Free";
  const repoLimit = subscription?.plan.repositoryLimit ?? 3;
  const analysisQuota = subscription?.plan.analysisQuota ?? 30;
  const analysisUsed = usage?.analysisCount ?? 0;
  const repoUsed = usage?.repositoryCount ?? 0;
  const quotaPercent = Math.round((analysisUsed / analysisQuota) * 100);
  const isOverQuota = quotaPercent >= 80;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Billing</h1>

      {/* Quota warning */}
      {isOverQuota && (
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 mb-6"
          style={{ backgroundColor: "var(--color-severity-medium-bg)", borderColor: "var(--color-severity-medium-text)", borderRadius: "var(--radius-card)" }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              You have used {quotaPercent}% of your analysis quota.
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              <Link href="/billing/plans" className="underline" style={{ color: "var(--color-primary)" }}>Upgrade your plan</Link> to continue analyzing PRs.
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
            <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>Current Plan</div>
            <div className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{planName}</div>
            <span
              className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
              style={{
                backgroundColor: subscription?.status === "ACTIVE" ? "#e6f4ea" : "#ffebe9",
                color: subscription?.status === "ACTIVE" ? "#1a7f37" : "#cf222e",
                borderRadius: "var(--radius-badge)",
              }}
            >
              {subscription?.status ?? "No subscription"}
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/billing/plans"
              className="text-sm px-3 py-2 rounded-md text-white"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
            >
              Change plan
            </Link>
          </div>
        </div>

        {/* Quota meters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>Analysis quota</span>
              <span>{analysisUsed} / {analysisQuota}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-muted)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(quotaPercent, 100)}%`,
                  backgroundColor: isOverQuota ? "var(--color-danger)" : "var(--color-primary)",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>Repositories</span>
              <span>{repoUsed} / {repoLimit}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-muted)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(Math.round((repoUsed / repoLimit) * 100), 100)}%`, backgroundColor: "var(--color-primary)" }}
              />
            </div>
          </div>
        </div>

        {subscription?.renewalDate && (
          <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>
            Renews {new Date(subscription.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Usage cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Analyses this month", value: analysisUsed, icon: BarChart },
          { label: "Repositories", value: repoUsed, icon: GitBranch },
          { label: "Reports generated", value: usage?.reportCount ?? 0, icon: CreditCard },
          { label: "Quota used", value: `${quotaPercent}%`, icon: Gauge },
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
          { href: "/billing/plans", label: "View plans" },
          { href: "/billing/subscription", label: "Subscription details" },
          { href: "/billing/usage", label: "Usage history" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm px-3 py-2 rounded-md border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
