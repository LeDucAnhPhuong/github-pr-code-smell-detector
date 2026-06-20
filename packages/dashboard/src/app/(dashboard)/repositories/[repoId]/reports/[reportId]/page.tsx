import { auth } from "@/lib/auth";
import { getReport } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { CopyButton } from "@/components/reports/CopyButton";

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

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Reports", href: `/repositories/${repoId}/reports` },
          { label: report.id.slice(0, 8).toUpperCase() },
        ]}
      />

      <div className="grid-2-1">
        {/* Markdown preview */}
        <div className="card">
          <div className="card-head">
            <h2 className="h2">Report preview</h2>
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
              {report.content || "# Code Smell Report\n\nNo findings detected in this analysis run."}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        <div className="card">
          <div className="card-head">
            <h2 className="h2">Metadata</h2>
          </div>
          <div className="card-body">
            <dl className="stack" style={{ fontSize: 12 }}>
              {(
                [
                  ["Pull request", `#${pr.prNumber} ${pr.title.slice(0, 30)}`],
                  ["Commit SHA", pr.commitSha.slice(0, 8)],
                  ["Status", report.status],
                  ["Created", new Date(report.createdAt).toLocaleString()],
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
              Findings by severity
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
