import { auth } from "@/lib/auth";
import { getSubscription, getAllPlans } from "@/lib/db/billing";
import { Check } from "lucide-react";

export default async function PlansPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, plans] = await Promise.all([getSubscription(userId), getAllPlans()]);
  const currentPlanId = subscription?.planId;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Subscription Plans</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Choose the plan that fits your team&apos;s analysis needs.
      </p>

      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className="rounded-lg border p-5"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: isCurrent ? "var(--color-primary)" : "var(--color-border)",
                borderWidth: isCurrent ? "2px" : "1px",
                borderRadius: "var(--radius-card)",
              }}
            >
              {isCurrent && (
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded mb-3 inline-block"
                  style={{ backgroundColor: "var(--color-primary)", color: "white", borderRadius: "var(--radius-badge)" }}
                >
                  Current plan
                </div>
              )}
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>{plan.name}</h2>
              <div className="text-2xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
                {Number(plan.price) === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}/mo`}
              </div>
              <ul className="space-y-2 text-sm mb-6">
                {[
                  `${plan.repositoryLimit} repositories`,
                  `${plan.analysisQuota.toLocaleString()} analyses/month`,
                  "PR comments",
                  plan.hasCheckAnnotations ? "GitHub Check annotations" : null,
                  plan.hasHistoricalReports ? "Historical reports" : null,
                ].filter(Boolean).map((feature) => (
                  <li key={String(feature)} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
                    <span style={{ color: "var(--color-text-secondary)" }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: isCurrent ? "var(--color-surface-muted)" : "var(--color-primary)",
                  color: isCurrent ? "var(--color-text-secondary)" : "white",
                  borderRadius: "var(--radius-card)",
                  cursor: isCurrent ? "not-allowed" : "pointer",
                }}
                disabled={isCurrent}
              >
                {isCurrent ? "Current plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: "var(--color-text-muted)" }}>
        Plan changes are processed by an admin. Upgrades take effect within 1 business day.
      </p>
    </div>
  );
}
