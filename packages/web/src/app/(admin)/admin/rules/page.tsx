import { getRules } from "@/lib/db/admin";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { Plus } from "lucide-react";

export default async function AdminRulesPage() {
  const rules = await getRules();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Rule Catalog</h1>
        <button
          className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md text-white"
          style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
        >
          <Plus className="w-4 h-4" />
          Create rule
        </button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
              {["Rule ID", "Name", "Framework", "Category", "Severity", "Threshold", "Status", "Updated"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.id}</td>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{rule.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.framework.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.category.name}</td>
                <td className="px-4 py-3"><SeverityBadge severity={rule.defaultSeverity} /></td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.defaultThreshold ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: rule.isActive ? "#e6f4ea" : "#f0f3f6",
                      color: rule.isActive ? "#1a7f37" : "#57606a",
                      borderRadius: "var(--radius-badge)",
                    }}
                  >
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(rule.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
