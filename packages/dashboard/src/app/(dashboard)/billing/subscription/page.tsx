import { auth } from "@/lib/auth";
import { getSubscription, getUsage } from "@/lib/db/billing";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function SubscriptionPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, usage, t, tSubStatus] = await Promise.all([
    getSubscription(userId),
    getUsage(userId),
    getTranslations("subscriptionPage"),
    getTranslations("subscriptionStatus"),
  ]);

  const details: [string, string][] = [
    [t("subscriptionId"), subscription?.id?.slice(0, 8).toUpperCase() ?? "—"],
    [t("plan"), subscription?.plan.name ?? "—"],
    [t("status"), subscription ? tSubStatus(subscription.status) : "—"],
    [t("started"), subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : "—"],
    [t("renews"), subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "—"],
    [t("billingOwner"), subscription?.billingOwner ?? session!.user.name ?? "—"],
  ];

  return (
    <div className="page-w stack">
      <h1 className="h1">{t("title")}</h1>

      <div className="card">
        <div className="card-head">
          <h2 className="h2">{t("detailsHeading")}</h2>
        </div>
        <div className="card-body">
          <table className="table">
            <tbody>
              {details.map(([label, value]) => (
                <tr key={label}>
                  <td className="muted" style={{ width: 160, fontSize: 12 }}>
                    {label}
                  </td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-body">
        <h2 className="h2" style={{ marginBottom: 14 }}>
          {t("usageQuota")}
        </h2>
        <div className="stack" style={{ gap: 12 }}>
          {[
            { label: t("repositories"), used: usage?.repositoryCount ?? 0, limit: subscription?.plan.repositoryLimit ?? 3 },
            { label: t("analysesThisMonth"), used: usage?.analysisCount ?? 0, limit: subscription?.plan.analysisQuota ?? 30 },
            { label: t("reports"), used: usage?.reportCount ?? 0, limit: 999 },
          ].map(({ label, used, limit }) => (
            <div key={label}>
              <div className="between" style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>
                <span>{label}</span>
                <span>
                  {used} / {limit === 999 ? "∞" : limit}
                </span>
              </div>
              {limit !== 999 && (
                <div className="bar">
                  <i style={{ width: `${Math.min(Math.round((used / limit) * 100), 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <Link href="/billing/plans" className="btn btn-primary btn-sm">
          {t("changePlan")}
        </Link>
        <button className="btn btn-danger btn-sm">{t("cancelSubscription")}</button>
      </div>
    </div>
  );
}
