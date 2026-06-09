import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getAnalysis } from "@/lib/db/analyses";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { AnalysisStatusPoller, AnalysisStatusBadge } from "@/components/analyses/AnalysisStatus";
import { AlertTriangle, FileCode, CheckCircle, Clock, RefreshCw, ExternalLink } from "lucide-react";

function MetricCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: highlight ? "var(--color-severity-high-text)" : "var(--color-border)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      <div className="text-2xl font-semibold" style={{ color: highlight ? "var(--color-danger)" : "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

export default async function PRAnalysisDetailPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const session = await auth();
  const { repoId, prId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const pr = await prisma.pullRequest.findFirst({
    where: { id: prId, repositoryId: repo.id },
  });
  if (!pr) notFound();

  // Get latest analysis
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

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Pull Requests", href: `/repositories/${repoId}/pulls` },
        { label: `#${pr.prNumber}` },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            #{pr.prNumber} {pr.title}
          </h1>
          <div className="flex items-center gap-3">
            {latestAnalysis ? (
              latestAnalysis.status === "RUNNING" || latestAnalysis.status === "PENDING" ? (
                <AnalysisStatusPoller analysisId={latestAnalysis.id} initialStatus={latestAnalysis.status} />
              ) : (
                <AnalysisStatusBadge status={latestAnalysis.status} />
              )
            ) : (
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>No analysis yet</span>
            )}
            <span className="font-mono text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>
              {pr.commitSha.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={pr.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in GitHub
          </a>
        </div>
      </div>

      {/* Summary cards */}
      {latestAnalysis?.status === "COMPLETED" && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <MetricCard label="Total Findings" value={latestAnalysis.findings.length} />
          <MetricCard label="High" value={highCount} highlight={highCount > 0} />
          <MetricCard label="Medium" value={mediumCount} />
          <MetricCard label="Low" value={lowCount} />
          <MetricCard label="Files Analyzed" value={latestAnalysis.changedFiles.filter((f) => f.status === "ANALYZED").length} />
          <MetricCard label="Runtime" value={latestAnalysis.runtimeMs ? `${(latestAnalysis.runtimeMs / 1000).toFixed(1)}s` : "—"} />
        </div>
      )}

      {/* Failed state diagnostic */}
      {latestAnalysis?.status === "FAILED" && (
        <div
          className="rounded-lg border p-4 mb-6"
          style={{ backgroundColor: "var(--color-severity-high-bg)", borderColor: "var(--color-severity-high-text)", borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-severity-high-text)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-severity-high-text)" }}>Analysis failed</span>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            {latestAnalysis.diagnosticMessage ?? "An error occurred during analysis. Check your webhook and configuration."}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center gap-1 px-4 pt-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          {["Findings", "Changed Files", "Evaluation", "Raw Report"].map((tab, i) => (
            <Link
              key={tab}
              href={i === 0 ? `/repositories/${repoId}/pulls/${prId}/findings`
                : i === 1 ? `/repositories/${repoId}/pulls/${prId}/files`
                : `/repositories/${repoId}/pulls/${prId}/findings`}
              className="px-3 py-2 text-sm border-b-2 -mb-px"
              style={{
                borderColor: i === 0 ? "var(--color-primary)" : "transparent",
                color: i === 0 ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
            >
              {tab}
            </Link>
          ))}
        </div>

        {/* Findings preview */}
        {!latestAnalysis || latestAnalysis.findings.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            {latestAnalysis?.status === "COMPLETED" ? "No findings detected." : "Run analysis to see findings."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                {["Severity", "Rule", "File", "Line", "Message"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latestAnalysis.findings.slice(0, 10).map((f) => (
                <tr key={f.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-2.5"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>{f.ruleId}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono" style={{ color: "var(--color-primary)" }}>
                      {f.filePath.split("/").slice(-2).join("/")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{f.lineStart}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {f.message.slice(0, 80)}{f.message.length > 80 ? "…" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {latestAnalysis && latestAnalysis.findings.length > 10 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link href={`/repositories/${repoId}/pulls/${prId}/findings`} className="text-sm hover:underline" style={{ color: "var(--color-primary)" }}>
              View all {latestAnalysis.findings.length} findings →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
