import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getCategories } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

export default async function CategorySettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const categories = await getCategories();

  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Configuration", href: `/repositories/${repoId}/config` },
        { label: "Categories" },
      ]} />
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Category Settings</h1>
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
              {["Category", "Description", "Rules", "Default Severity", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{cat.name}</td>
                <td className="px-4 py-3 text-xs max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {(cat.description ?? "").slice(0, 60)}{(cat.description ?? "").length > 60 ? "…" : ""}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{cat._count.rules}</td>
                <td className="px-4 py-3"><SeverityBadge severity={cat.defaultSeverity} /></td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: cat.isActive ? "#e6f4ea" : "#f0f3f6",
                      color: cat.isActive ? "#1a7f37" : "#57606a",
                      borderRadius: "var(--radius-badge)",
                    }}
                  >
                    {cat.isActive ? "Active" : "Inactive"}
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
