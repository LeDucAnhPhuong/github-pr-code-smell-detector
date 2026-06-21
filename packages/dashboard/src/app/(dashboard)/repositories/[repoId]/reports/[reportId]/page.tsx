import { auth } from "@/lib/auth";
import { getReport } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { CopyButton } from "@/components/reports/CopyButton";
import { getTranslations } from "next-intl/server";

export default async function ReportDetailPage({ params }: { params: Promise<{ repoId: string; reportId: string }> }) {
  const session = await auth();
  const { repoId, reportId } = await params;
  const report = await getReport(reportId, session!.user.id);
  if (!report) notFound();

  const repo = report.prAnalysis.pullRequest.repository;
  const pr = report.prAnalysis.pullRequest;
  const highCount = report.prAnalysis.findings.filter((f) => f.severity === "error").length;
  const mediumCount = report.prAnalysis.findings.filter((f) => f.severity === "warning").length;
  const lowCount = report.prAnalysis.findings.filter((f) => f.severity === "info").length;

  const t = await getTranslations("reportDetail");
  const tReportStatus = await getTranslations("reportStatus");

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbReports"), href: `/repositories/${repoId}/reports` },
          { label: report.id.slice(0, 8).toUpperCase() },
        ]}
      />

      <div className="grid-2-1">
        {/* Markdown preview */}
        <div className="card">
          <div className="card-head">
            <h2 className="h2">{t("reportPreview")}</h2>
            <CopyButton text={report.content} />
          </div>
          <div className="card-body">
            <pre
              className="mono"
              style={{
                fontSize: 12,
                padding: 14,
                borderRadius: "var(--r)",
                background: "var(--code-bg)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                minHeight: 300,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {report.content || t("emptyReport")}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        <div className="card">
          <div className="card-head">
            <h2 className="h2">{t("metadata")}</h2>
          </div>
          <div className="card-body">
            <dl className="stack" style={{ fontSize: 12 }}>
              {(
                [
                  [t("pullRequest"), `#${pr.prNumber} ${pr.title.slice(0, 30)}`],
                  [t("commitSha"), pr.commitSha.slice(0, 8)],
                  [t("status"), tReportStatus(report.status)],
                  [t("created"), new Date(report.createdAt).toLocaleString()],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="muted" style={{ fontWeight: 500 }}>
                    {label}
                  </dt>
                  <dd style={{ marginTop: 2, marginLeft: 0 }}>{value}</dd>
                </div>
              ))}
            </dl>
            <hr className="divider" style={{ margin: "14px 0" }} />
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              {t("findingsBySeverity")}
            </p>
            <div className="stack" style={{ gap: 6 }}>
              <div className="between">
                <SeverityBadge severity="error" />
                <span className="secondary">{highCount}</span>
              </div>
              <div className="between">
                <SeverityBadge severity="warning" />
                <span className="secondary">{mediumCount}</span>
              </div>
              <div className="between">
                <SeverityBadge severity="info" />
                <span className="secondary">{lowCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
