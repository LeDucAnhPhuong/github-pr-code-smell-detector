import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getRules } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

export default async function RuleSettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const rules = await getRules();
  const config = (repo.config as Record<string, Record<string, unknown>>) ?? {};
  const ruleOverrides = (config.rules as Record<string, Record<string, unknown>>) ?? {};

  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Configuration", href: `/repositories/${repoId}/config` },
        { label: "Rules" },
      ]} />
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Rule Settings</h1>

      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
              {["", "Rule", "Framework", "Category", "Severity", "Threshold", "Blocking"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const override = ruleOverrides[rule.id] ?? {};
              const enabled = override.enabled !== false;
              return (
                <tr key={rule.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-2.5">
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: enabled ? "var(--color-primary)" : "var(--color-surface)", borderColor: enabled ? "var(--color-primary)" : "var(--color-border)" }}
                    >
                      {enabled && <span className="text-white text-xs">✓</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{rule.name}</div>
                    <div className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{rule.id}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.framework.name}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.category.name}</td>
                  <td className="px-4 py-2.5"><SeverityBadge severity={rule.defaultSeverity} /></td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {rule.defaultThreshold ? `${rule.defaultThreshold}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {(override.blocking as boolean) ? "Yes" : "No"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
