import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getRules } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { Check } from "lucide-react";

export default async function RuleSettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const rules = await getRules();
  const config = (repo.config as Record<string, Record<string, unknown>>) ?? {};
  const ruleOverrides = (config.rules as Record<string, Record<string, unknown>>) ?? {};

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Configuration", href: `/repositories/${repoId}/config` },
          { label: "Rules" },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        Rule settings
      </h1>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Rule</th>
              <th>Framework</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Threshold</th>
              <th>Blocking</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const override = ruleOverrides[rule.id] ?? {};
              const enabled = override.enabled !== false;
              return (
                <tr key={rule.id}>
                  <td style={{ width: 36 }}>
                    <span className={`check ${enabled ? "" : "empty"}`}>
                      {enabled && <Check width={10} height={10} color="#fff" />}
                    </span>
                  </td>
                  <td>
                    <div className="cell-strong">{rule.name}</div>
                    <div className="muted mono" style={{ fontSize: 11.5 }}>
                      {rule.id}
                    </div>
                  </td>
                  <td className="secondary">{rule.framework.name}</td>
                  <td className="secondary">{rule.category.name}</td>
                  <td>
                    <SeverityBadge severity={rule.defaultSeverity} />
                  </td>
                  <td className="secondary">{rule.defaultThreshold ? `${rule.defaultThreshold}` : "—"}</td>
                  <td className="muted">{(override.blocking as boolean) ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
