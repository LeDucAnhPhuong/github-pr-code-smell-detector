import { auth } from "@/lib/auth";
import { getSubscription, getAllPlans } from "@/lib/db/billing";
import { Check } from "lucide-react";

export default async function PlansPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, plans] = await Promise.all([getSubscription(userId), getAllPlans()]);
  const currentPlanId = subscription?.planId;

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 4 }}>
        Subscription plans
      </h1>
      <p className="secondary" style={{ marginBottom: 24, fontSize: 13 }}>
        Choose the plan that fits your team&apos;s analysis needs.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div key={plan.id} className="card card-body" style={isCurrent ? { borderColor: "var(--ink)", borderWidth: 2 } : undefined}>
              {isCurrent && (
                <span className="badge" style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", marginBottom: 12 }}>
                  Current plan
                </span>
              )}
              <h2 className="h2" style={{ fontSize: 16, marginBottom: 2 }}>
                {plan.name}
              </h2>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, letterSpacing: "-.02em" }}>
                {Number(plan.price) === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}/mo`}
              </div>
              <ul className="stack" style={{ listStyle: "none", margin: "0 0 20px", padding: 0, gap: 8 }}>
                {[
                  `${plan.repositoryLimit} repositories`,
                  `${plan.analysisQuota.toLocaleString()} analyses/month`,
                  "PR comments",
                  plan.hasCheckAnnotations ? "GitHub Check annotations" : null,
                  plan.hasHistoricalReports ? "Historical reports" : null,
                ]
                  .filter(Boolean)
                  .map((feature) => (
                    <li key={String(feature)} className="row" style={{ gap: 8 }}>
                      <Check className="w-3.5 h-3.5" style={{ color: "var(--ok-ink)", flex: "none" }} />
                      <span className="secondary">{feature}</span>
                    </li>
                  ))}
              </ul>
              <button
                className={`btn ${isCurrent ? "btn-secondary" : "btn-primary"}`}
                style={{ width: "100%", justifyContent: "center", ...(isCurrent ? { cursor: "not-allowed", opacity: 0.7 } : {}) }}
                disabled={isCurrent}
              >
                {isCurrent ? "Current plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 24, textAlign: "center" }}>
        Plan changes are processed by an admin. Upgrades take effect within 1 business day.
      </p>
    </div>
  );
}
