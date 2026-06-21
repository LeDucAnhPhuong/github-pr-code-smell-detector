import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getRules } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function RuleSettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const rules = await getRules();
  const t = await getTranslations("rulesPage");
  const config = (repo.config as Record<string, Record<string, unknown>>) ?? {};
  const ruleOverrides = (config.rules as Record<string, Record<string, unknown>>) ?? {};

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbConfig"), href: `/repositories/${repoId}/config` },
          { label: t("breadcrumbRules") },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        {t("title")}
      </h1>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>{t("thRule")}</th>
              <th>{t("thFramework")}</th>
              <th>{t("thCategory")}</th>
              <th>{t("thSeverity")}</th>
              <th>{t("thThreshold")}</th>
              <th>{t("thBlocking")}</th>
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
                  <td className="muted">{(override.blocking as boolean) ? t("yes") : t("no")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
