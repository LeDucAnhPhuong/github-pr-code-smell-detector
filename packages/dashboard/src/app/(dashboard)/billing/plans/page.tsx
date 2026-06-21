import { auth } from "@/lib/auth";
import { getSubscription, getAllPlans } from "@/lib/db/billing";
import { formatPlanPrice } from "@/lib/format";
import { UpgradeButton } from "./UpgradeButton";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function PlansPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, plans, t] = await Promise.all([
    getSubscription(userId),
    getAllPlans(),
    getTranslations("plansPage"),
  ]);
  const currentPlanId = subscription?.planId;

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 4 }}>
        {t("title")}
      </h1>
      <p className="secondary" style={{ marginBottom: 24, fontSize: 13 }}>
        {t("subtitle")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div key={plan.id} className="card card-body" style={isCurrent ? { borderColor: "var(--ink)", borderWidth: 2 } : undefined}>
              {isCurrent && (
                <span className="badge" style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", marginBottom: 12 }}>
                  {t("currentPlanBadge")}
                </span>
              )}
              <h2 className="h2" style={{ fontSize: 16, marginBottom: 2 }}>
                {plan.name}
              </h2>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, letterSpacing: "-.02em" }}>
                {formatPlanPrice(Number(plan.price))}
              </div>
              <ul className="stack" style={{ listStyle: "none", margin: "0 0 20px", padding: 0, gap: 8 }}>
                {[
                  t("featureRepositories", { count: plan.repositoryLimit }),
                  t("featureAnalyses", { count: plan.analysisQuota }),
                  t("featurePRComments"),
                  plan.hasCheckAnnotations ? t("featureCheckAnnotations") : null,
                  plan.hasHistoricalReports ? t("featureHistoricalReports") : null,
                ]
                  .filter(Boolean)
                  .map((feature) => (
                    <li key={String(feature)} className="row" style={{ gap: 8 }}>
                      <Check className="w-3.5 h-3.5" style={{ color: "var(--ok-ink)", flex: "none" }} />
                      <span className="secondary">{feature}</span>
                    </li>
                  ))}
              </ul>
              {isCurrent ? (
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", cursor: "not-allowed", opacity: 0.7 }}
                  disabled
                >
                  {t("currentPlanButton")}
                </button>
              ) : Number(plan.price) === 0 ? (
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", cursor: "not-allowed", opacity: 0.7 }}
                  disabled
                >
                  {t("free")}
                </button>
              ) : (
                <UpgradeButton planId={plan.id} label={currentPlanId ? t("upgrade") : t("subscribe")} />
              )}
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 24, textAlign: "center" }}>
        {t("paymentNote")}
      </p>
    </div>
  );
}
