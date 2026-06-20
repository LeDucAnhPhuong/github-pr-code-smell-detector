import { getPlansAdmin } from "@/lib/db/admin";

export default async function AdminPlansPage() {
  const plans = await getPlansAdmin();

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 20 }}>
        Subscription plan management
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Repo limit</th>
              <th>Analysis quota</th>
              <th>Check annotations</th>
              <th>Historical reports</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="cell-strong">{plan.name}</td>
                <td className="secondary">{Number(plan.price) === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}/mo`}</td>
                <td className="secondary">{plan.repositoryLimit}</td>
                <td className="secondary">{plan.analysisQuota.toLocaleString()}</td>
                <td style={{ color: plan.hasCheckAnnotations ? "var(--ok-ink)" : "var(--ink-3)" }}>
                  {plan.hasCheckAnnotations ? "Yes" : "No"}
                </td>
                <td style={{ color: plan.hasHistoricalReports ? "var(--ok-ink)" : "var(--ink-3)" }}>
                  {plan.hasHistoricalReports ? "Yes" : "No"}
                </td>
                <td>
                  <span className="status">
                    <span className="dot" style={{ background: plan.isActive ? "var(--ok-dot)" : "var(--idle-dot)" }} />
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
