import { auth } from "@/lib/auth";
import { getFinding } from "@/lib/db/findings";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ repoId: string; prId: string; findingId: string }>;
}) {
  const session = await auth();
  const { repoId, prId, findingId } = await params;
  const finding = await getFinding(findingId, session!.user.id);
  if (!finding) notFound();

  const repo = finding.prAnalysis.pullRequest.repository;
  const pr = finding.prAnalysis.pullRequest;
  const githubFileUrl = `https://github.com/${repo.fullName}/blob/${pr.commitSha}/${finding.filePath}#L${finding.lineStart}`;

  const t = await getTranslations("findingDetail");

  const meta: [string, React.ReactNode][] = [
    [t("ruleId"), <span key="rid" className="mono" style={{ fontSize: 12 }}>{finding.ruleId}</span>],
    [t("category"), finding.rule?.category?.name ?? "—"],
    [t("framework"), finding.rule?.framework?.name ?? "—"],
    [t("analysis"), finding.prAnalysisId.slice(0, 8) + "…"],
    [t("commitSha"), <span key="sha" className="mono" style={{ fontSize: 12 }}>{pr.commitSha.slice(0, 8)}</span>],
  ];

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
          { label: t("breadcrumbFindings"), href: `/repositories/${repoId}/pulls/${prId}/findings` },
          { label: finding.ruleName },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        {/* Left: metadata */}
        <div className="card">
          <div className="card-head" style={{ background: "var(--bg-subtle)" }}>
            <div className="row" style={{ gap: 8 }}>
              <SeverityBadge severity={finding.severity} />
              <h1 className="h2" style={{ fontSize: 15 }}>
                {finding.ruleName}
              </h1>
            </div>
            <span className="code">
              {finding.filePath.split("/").slice(-1)}:{finding.lineStart}
            </span>
          </div>

          <div className="card-body stack">
            <table className="table">
              <tbody>
                {meta.map(([label, value]) => (
                  <tr key={label}>
                    <td className="muted" style={{ width: 120, fontSize: 12 }}>
                      {label}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="stack">
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  {t("whatDetected")}
                </p>
                <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
                  {finding.message}
                </p>
              </div>
              {finding.rule?.whyItMatters && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>
                    {t("whyItMatters")}
                  </p>
                  <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
                    {finding.rule.whyItMatters}
                  </p>
                </div>
              )}
              {finding.suggestion && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>
                    {t("suggestedRefactor")}
                  </p>
                  <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
                    {finding.suggestion}
                  </p>
                </div>
              )}
            </div>

            <a href={githubFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ width: "fit-content" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              {t("openFileInGithub")}
            </a>
          </div>
        </div>

        {/* Right: code context */}
        <div className="card">
          <div className="card-head">
            <h2 className="h2">{t("codeContext")}</h2>
            <span className="code">{finding.filePath}</span>
          </div>
          <div className="card-body">
            <div
              className="mono"
              style={{
                fontSize: 12,
                background: "var(--code-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: 12,
                minHeight: 180,
              }}
            >
              <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                <span className="muted" style={{ userSelect: "none", minWidth: "2rem" }}>
                  {finding.lineStart}
                </span>
                <span
                  style={{
                    flex: 1,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--sev-high-bg)",
                    color: "var(--ink)",
                  }}
                >
                  {`// Line ${finding.lineStart} — ${finding.filePath.split("/").pop()}`}
                </span>
              </div>
              <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
                {t("codeContextNote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
