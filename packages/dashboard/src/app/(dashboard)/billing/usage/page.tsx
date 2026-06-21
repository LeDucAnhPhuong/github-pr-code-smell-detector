import { auth } from "@/lib/auth";
import { getUsageHistory } from "@/lib/db/billing";
import { getTranslations } from "next-intl/server";

export default async function UsageHistoryPage() {
  const session = await auth();
  const userId = session!.user.id;
  const usageHistory = await getUsageHistory(userId);
  const t = await getTranslations("usagePage");

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 20 }}>
        {t("title")}
      </h1>

      <div className="card" style={{ overflow: "hidden" }}>
        {usageHistory.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("noHistory")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thMonth")}</th>
                <th>{t("thAnalyses")}</th>
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
