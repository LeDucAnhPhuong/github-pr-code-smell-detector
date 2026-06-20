import { auth } from "@/lib/auth";
import { getSubscription, getUsage } from "@/lib/db/billing";
import Link from "next/link";

export default async function SubscriptionPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [subscription, usage] = await Promise.all([getSubscription(userId), getUsage(userId)]);

  const details: [string, string][] = [
    ["Subscription ID", subscription?.id?.slice(0, 8).toUpperCase() ?? "—"],
    ["Plan", subscription?.plan.name ?? "—"],
    ["Status", subscription?.status ?? "—"],
    ["Started", subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : "—"],
    ["Renews", subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "—"],
    ["Billing owner", subscription?.billingOwner ?? session!.user.name ?? "—"],
  ];

  return (
    <div className="page-w stack">
      <h1 className="h1">Current subscription</h1>

      <div className="card">
        <div className="card-head">
          <h2 className="h2">Subscription details</h2>
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
          Usage quota
        </h2>
        <div className="stack" style={{ gap: 12 }}>
          {[
            { label: "Repositories", used: usage?.repositoryCount ?? 0, limit: subscription?.plan.repositoryLimit ?? 3 },
            { label: "Analyses this month", used: usage?.analysisCount ?? 0, limit: subscription?.plan.analysisQuota ?? 30 },
            { label: "Reports", used: usage?.reportCount ?? 0, limit: 999 },
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
          Change plan
        </Link>
        <button className="btn btn-danger btn-sm">Cancel subscription</button>
      </div>
    </div>
  );
}
