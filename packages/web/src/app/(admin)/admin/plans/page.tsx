import { getPlansAdmin } from "@/lib/db/admin";

export default async function AdminPlansPage() {
  const plans = await getPlansAdmin();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Subscription Plan Management</h1>
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
              {["Plan", "Price", "Repo Limit", "Analysis Quota", "Check Annotations", "Historical Reports", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{plan.name}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {Number(plan.price) === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}/mo`}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{plan.repositoryLimit}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{plan.analysisQuota.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm" style={{ color: plan.hasCheckAnnotations ? "var(--color-success)" : "var(--color-text-muted)" }}>
                  {plan.hasCheckAnnotations ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: plan.hasHistoricalReports ? "var(--color-success)" : "var(--color-text-muted)" }}>
                  {plan.hasHistoricalReports ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: plan.isActive ? "#e6f4ea" : "#f0f3f6", color: plan.isActive ? "#1a7f37" : "#57606a", borderRadius: "var(--radius-badge)" }}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
