import { getFrameworks } from "@/lib/db/admin";

export default async function AdminFrameworksPage() {
  const frameworks = await getFrameworks();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Framework Catalog</h1>
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
              {["Framework", "Extensions", "Active Rules", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frameworks.map((fw) => (
              <tr key={fw.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{fw.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {fw.supportedExtensions.map((ext) => (
                      <span key={ext} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>
                        {ext}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{fw._count.rules}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: fw.isActive ? "#e6f4ea" : "#f0f3f6", color: fw.isActive ? "#1a7f37" : "#57606a", borderRadius: "var(--radius-badge)" }}
                  >
                    {fw.isActive ? "Active" : "Inactive"}
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
