import { auth } from "@/lib/auth";
import { getReport } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

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
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Reports", href: `/repositories/${repoId}/reports` },
        { label: report.id.slice(0, 8).toUpperCase() },
      ]} />

      <div className="grid grid-cols-3 gap-6">
        {/* Markdown preview */}
        <div
          className="col-span-2 rounded-lg border p-5"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Report Preview</h2>
            <button
              onClick={() => navigator.clipboard.writeText(report.content)}
              className="text-xs px-3 py-1.5 rounded-md border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
            >
              Copy Markdown
            </button>
          </div>
          <pre
            className="text-xs p-4 rounded-md overflow-auto whitespace-pre-wrap"
            style={{ backgroundColor: "var(--color-code-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", border: `1px solid var(--color-border)`, minHeight: "300px" }}
          >
            {report.content || "# Code Smell Report\n\nNo findings detected in this analysis run."}
          </pre>
        </div>

        {/* Metadata */}
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Metadata</h2>
          <dl className="space-y-3 text-xs">
            {[
              ["Pull Request", `#${pr.prNumber} ${pr.title.slice(0, 30)}`],
              ["Commit SHA", pr.commitSha.slice(0, 8)],
              ["Status", report.status],
              ["Created", new Date(report.createdAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</dt>
                <dd className="mt-0.5" style={{ color: "var(--color-text-primary)" }}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>Findings by severity</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <SeverityBadge severity="error" />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{highCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <SeverityBadge severity="warning" />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{mediumCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <SeverityBadge severity="info" />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{lowCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
