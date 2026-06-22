import { auth } from "@/lib/auth";
import { getUsageHistory, getUsage, getSubscription } from "@/lib/db/billing";
import { getTranslations } from "next-intl/server";

export default async function UsageHistoryPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [usageHistory, usage, subscription] = await Promise.all([
    getUsageHistory(userId),
    getUsage(userId),
    getSubscription(userId),
  ]);
  const t = await getTranslations("usagePage");

  const tokenUsed = usage?.tokenUsed ?? 0;
  const tokenQuota = subscription?.plan.tokenQuota ?? 0;
  const unlimited = tokenQuota <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((tokenUsed / tokenQuota) * 100));
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 20 }}>
        {t("title")}
      </h1>

      {/* Current-month token budget (plan 09) */}
      <div className="card card-body" style={{ marginBottom: 18 }}>
        <div className="between" style={{ marginBottom: 8 }}>
          <span className="eyebrow">{t("tokenUsageTitle")}</span>
          <span className="secondary" style={{ fontSize: 13 }}>
            {unlimited ? t("unlimited") : `${fmt(tokenUsed)} / ${fmt(tokenQuota)} (${pct}%)`}
          </span>
        </div>
        {!unlimited && (
          <div style={{ height: 8, borderRadius: 4, background: "var(--code-bg)", overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: pct >= 80 ? "var(--fail-dot)" : "var(--ok-dot)",
              }}
            />
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {usageHistory.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("noHistory")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thMonth")}</th>
                <th>{t("thAnalyses")}</th>
                <th>{t("thTokens")}</th>
                <th>{t("thRepositories")}</th>
                <th>{t("thReports")}</th>
              </tr>
            </thead>
            <tbody>
              {usageHistory.map((u) => {
                const year = Math.floor(u.month / 100);
                const month = u.month % 100;
                const date = new Date(year, month - 1, 1);
                return (
                  <tr key={u.id}>
                    <td className="cell-strong">{date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</td>
                    <td className="secondary">{u.analysisCount}</td>
                    <td className="secondary">{u.tokenUsed.toLocaleString("en-US")}</td>
                    <td className="secondary">{u.repositoryCount}</td>
                    <td className="secondary">{u.reportCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
