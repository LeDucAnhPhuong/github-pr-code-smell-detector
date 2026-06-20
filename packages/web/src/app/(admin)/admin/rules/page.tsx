import { getRules } from "@/lib/db/admin";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { Plus } from "lucide-react";

export default async function AdminRulesPage() {
  const rules = await getRules();

  return (
    <div className="page-w">
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">Rule catalog</h1>
        <button className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" />
          Create rule
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Name</th>
              <th>Framework</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="mono secondary" style={{ fontSize: 12 }}>
                  {rule.id}
                </td>
                <td className="cell-strong">{rule.name}</td>
                <td className="secondary">{rule.framework.name}</td>
                <td className="secondary">{rule.category.name}</td>
                <td>
                  <SeverityBadge severity={rule.defaultSeverity} />
                </td>
                <td className="secondary">{rule.defaultThreshold ?? "—"}</td>
                <td>
                  <span className="status">
                    <span className="dot" style={{ background: rule.isActive ? "var(--ok-dot)" : "var(--idle-dot)" }} />
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="muted">{new Date(rule.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
