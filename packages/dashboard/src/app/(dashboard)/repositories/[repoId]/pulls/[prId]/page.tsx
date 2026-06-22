import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { AnalysisStatusPoller, AnalysisStatusBadge } from "@/components/analyses/AnalysisStatus";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

function MetricCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="card card-body" style={highlight ? { borderColor: "var(--sev-high-bd)" } : undefined}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em", color: highlight ? "var(--sev-high-ink)" : "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

export default async function PRAnalysisDetailPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const session = await auth();
  const { repoId, prId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const pr = await prisma.pullRequest.findFirst({ where: { id: prId, repositoryId: repo.id } });
  if (!pr) notFound();

  const latestAnalysis = await prisma.prAnalysis.findFirst({
    where: { pullRequestId: pr.id },
    orderBy: { createdAt: "desc" },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { filePath: "asc" }] },
      changedFiles: true,
      evaluationResult: true,
      analysisReport: true,
    },
  });

  const highCount = latestAnalysis?.findings.filter((f) => f.severity === "error").length ?? 0;
  const mediumCount = latestAnalysis?.findings.filter((f) => f.severity === "warning").length ?? 0;
  const lowCount = latestAnalysis?.findings.filter((f) => f.severity === "info").length ?? 0;

  const t = await getTranslations("prDetail");

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbPulls"), href: `/repositories/${repoId}/pulls` },
          { label: `#${pr.prNumber}` },
        ]}
      />

      {/* Header */}
      <div className="between" style={{ alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 8 }}>
            #{pr.prNumber} {pr.title}
          </h1>
          <div className="row" style={{ gap: 12 }}>
            {latestAnalysis ? (
              latestAnalysis.status === "RUNNING" || latestAnalysis.status === "PENDING" ? (
                <AnalysisStatusPoller analysisId={latestAnalysis.id} initialStatus={latestAnalysis.status} />
              ) : (
                <AnalysisStatusBadge status={latestAnalysis.status} />
              )
            ) : (
              <span className="muted">{t("noAnalysisYet")}</span>
            )}
            <span className="code">{pr.commitSha.slice(0, 8)}</span>
          </div>
        </div>
        <a href={pr.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          <ExternalLink className="w-3.5 h-3.5" />
          {t("openInGithub")}
        </a>
      </div>

      {/* Summary cards */}
      {latestAnalysis?.status === "COMPLETED" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, marginBottom: 18 }}>
          <MetricCard label={t("totalFindings")} value={latestAnalysis.findings.length} />
          <MetricCard label={t("high")} value={highCount} highlight={highCount > 0} />
          <MetricCard label={t("medium")} value={mediumCount} />
          <MetricCard label={t("low")} value={lowCount} />
          <MetricCard label={t("filesAnalyzed")} value={latestAnalysis.changedFiles.filter((f) => f.status === "ANALYZED").length} />
          <MetricCard label={t("runtime")} value={latestAnalysis.runtimeMs ? `${(latestAnalysis.runtimeMs / 1000).toFixed(1)}s` : "—"} />
        </div>
      )}

      {/* Quality Score + summary (LLM pipeline — plan 04) */}
      {latestAnalysis?.status === "COMPLETED" && latestAnalysis.summary && (
        <div className="card card-body" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 12, alignItems: "center", marginBottom: 8 }}>
            {latestAnalysis.qualityScore != null && (
              <span
                className="badge"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  background: latestAnalysis.qualityScore <= 2 ? "var(--sev-high-bg)" : "var(--surface-2, var(--code-bg))",
                  color: latestAnalysis.qualityScore <= 2 ? "var(--sev-high-ink)" : "var(--ink)",
                }}
              >
                {t("qualityScore")}: {latestAnalysis.qualityScore}/5
              </span>
            )}
            <span style={{ fontWeight: 600 }}>{latestAnalysis.summary}</span>
          </div>
          {latestAnalysis.qualityReasoning && (
            <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
              {latestAnalysis.qualityReasoning}
            </p>
          )}
        </div>
      )}

      {/* Failed state */}
      {latestAnalysis?.status === "FAILED" && (
        <div
          className="card"
          style={{ background: "var(--sev-high-bg)", borderColor: "var(--sev-high-bd)", padding: 16, marginBottom: 18 }}
        >
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--sev-high-ink)" }} />
            <span style={{ fontWeight: 600, color: "var(--sev-high-ink)" }}>{t("analysisFailed")}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13 }}>
            {latestAnalysis.diagnosticMessage ?? t("analysisFailedDefault")}
          </p>
        </div>
      )}

      {/* Tabs + findings preview */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="row" style={{ gap: 2, padding: "8px 12px 0", borderBottom: "1px solid var(--border)" }}>
          {[t("tabFindings"), t("tabChangedFiles"), t("tabEvaluation"), t("tabRawReport")].map((tab, i) => (
            <Link
              key={tab}
              href={
                i === 0
                  ? `/repositories/${repoId}/pulls/${prId}/findings`
                  : i === 1
                    ? `/repositories/${repoId}/pulls/${prId}/files`
                    : `/repositories/${repoId}/pulls/${prId}/findings`
              }
              style={{
                padding: "8px 10px",
                fontSize: 13,
                marginBottom: -1,
                borderBottom: `2px solid ${i === 0 ? "var(--ink)" : "transparent"}`,
                color: i === 0 ? "var(--ink)" : "var(--ink-2)",
                fontWeight: i === 0 ? 500 : 400,
              }}
            >
              {tab}
            </Link>
          ))}
        </div>

        {!latestAnalysis || latestAnalysis.findings.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
            {latestAnalysis?.status === "COMPLETED" ? t("noFindingsDetected") : t("runAnalysisToSee")}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thSeverity")}</th>
                <th>{t("thRule")}</th>
                <th>{t("thFile")}</th>
                <th>{t("thLine")}</th>
                <th>{t("thMessage")}</th>
              </tr>
            </thead>
            <tbody>
              {latestAnalysis.findings.slice(0, 10).map((f) => (
                <tr key={f.id}>
                  <td>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="secondary" style={{ fontSize: 12 }}>
                    <span className="badge badge-neutral" style={{ marginRight: 6 }}>
                      {f.source === "custom" ? "Custom" : "System"}
                    </span>
                    {f.ruleName}
                  </td>
                  <td>
                    <span className="code">{f.filePath.split("/").slice(-2).join("/")}</span>
                  </td>
                  <td className="muted">{f.lineStart ?? "—"}</td>
                  <td className="secondary">
                    {f.message.slice(0, 80)}
                    {f.message.length > 80 ? "…" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {latestAnalysis && latestAnalysis.findings.length > 10 && (
          <div className="card-foot">
            <Link href={`/repositories/${repoId}/pulls/${prId}/findings`} className="link">
              {t("viewAllFindings", { count: latestAnalysis.findings.length })}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
