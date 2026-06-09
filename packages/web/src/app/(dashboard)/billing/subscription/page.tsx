import { auth } from "@/lib/auth";
import { getSubscription, getUsage } from "@/lib/db/billing";
import Link from "next/link";

export default async function SubscriptionPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, usage] = await Promise.all([getSubscription(userId), getUsage(userId)]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Current Subscription</h1>

      <div
        className="rounded-lg border p-5 mb-6"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Subscription Details</h2>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Subscription ID", subscription?.id?.slice(0, 8).toUpperCase() ?? "—"],
              ["Plan", subscription?.plan.name ?? "—"],
              ["Status", subscription?.status ?? "—"],
              ["Started", subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : "—"],
              ["Renews", subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "—"],
              ["Billing owner", subscription?.billingOwner ?? session!.user.name ?? "—"],
            ].map(([label, value]) => (
              <tr key={String(label)} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="py-2.5 pr-4 w-40 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</td>
                <td className="py-2.5 text-sm" style={{ color: "var(--color-text-primary)" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quota section */}
      <div
        className="rounded-lg border p-5 mb-6"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Usage Quota</h2>
        <div className="space-y-3">
          {[
            { label: "Repositories", used: usage?.repositoryCount ?? 0, limit: subscription?.plan.repositoryLimit ?? 3 },
            { label: "Analyses this month", used: usage?.analysisCount ?? 0, limit: subscription?.plan.analysisQuota ?? 30 },
            { label: "Reports", used: usage?.reportCount ?? 0, limit: 999 },
          ].map(({ label, used, limit }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
                <span>{label}</span>
                <span>{used} / {limit === 999 ? "∞" : limit}</span>
              </div>
              {limit !== 999 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-muted)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(Math.round((used / limit) * 100), 100)}%`, backgroundColor: "var(--color-primary)" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/billing/plans"
          className="text-sm px-3 py-2 rounded-md text-white"
          style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
        >
          Change plan
        </Link>
        <button
          className="text-sm px-3 py-2 rounded-md border"
          style={{ borderColor: "var(--color-border)", color: "var(--color-danger)", borderRadius: "var(--radius-card)" }}
        >
          Cancel subscription
        </button>
      </div>
    </div>
  );
}
