import { auth } from "@/lib/auth";
import { getUsageHistory } from "@/lib/db/billing";

export default async function UsageHistoryPage() {
  const session = await auth();
  const userId = session!.user.id;
  const usageHistory = await getUsageHistory(userId);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Usage History</h1>

      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        {usageHistory.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No usage history yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["Month", "Analyses", "Repositories", "Reports"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usageHistory.map((u) => {
                const year = Math.floor(u.month / 100);
                const month = u.month % 100;
                const date = new Date(year, month - 1, 1);
                return (
                  <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{u.analysisCount}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{u.repositoryCount}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{u.reportCount}</td>
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
