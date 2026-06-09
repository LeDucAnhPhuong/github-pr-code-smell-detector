import { auth } from "@/lib/auth";
import { getFinding } from "@/lib/db/findings";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { ExternalLink } from "lucide-react";

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

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
        { label: "Findings", href: `/repositories/${repoId}/pulls/${prId}/findings` },
        { label: finding.ruleName },
      ]} />

      <div className="grid grid-cols-2 gap-6">
        {/* Left panel: metadata */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <SeverityBadge severity={finding.severity} />
            <h1 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{finding.ruleName}</h1>
          </div>

          <div className="font-mono text-xs px-2 py-1 rounded mb-4 inline-block" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>
            {finding.filePath}:{finding.lineStart}
          </div>

          {/* Metadata */}
          <table className="w-full text-sm mb-6">
            <tbody>
              {[
                ["Rule ID", <span key="rid" className="font-mono text-xs">{finding.ruleId}</span>],
                ["Category", finding.rule?.category?.name ?? "—"],
                ["Framework", finding.rule?.framework?.name ?? "—"],
                ["Analysis", finding.prAnalysisId.slice(0, 8) + "…"],
                ["Commit SHA", <span key="sha" className="font-mono text-xs">{pr.commitSha.slice(0, 8)}</span>],
              ].map(([label, value]) => (
                <tr key={String(label)} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="py-2 pr-4 text-xs font-medium w-32" style={{ color: "var(--color-text-muted)" }}>{label}</td>
                  <td className="py-2 text-xs" style={{ color: "var(--color-text-primary)" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Explanation */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>What was detected</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{finding.message}</p>
            </div>
            {finding.rule?.whyItMatters && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>Why it matters</h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{finding.rule.whyItMatters}</p>
              </div>
            )}
            {finding.suggestion && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>Suggested refactor</h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{finding.suggestion}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <a
              href={githubFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open file in GitHub
            </a>
          </div>
        </div>

        {/* Right panel: code context */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>Code Context</h2>
          <div
            className="rounded-md p-4 text-xs font-mono overflow-auto"
            style={{ backgroundColor: "var(--color-code-bg)", borderRadius: "var(--radius-badge)", minHeight: "200px", border: `1px solid var(--color-border)` }}
          >
            <div className="flex items-start gap-3">
              <span style={{ color: "var(--color-text-muted)", userSelect: "none", minWidth: "2rem" }}>{finding.lineStart}</span>
              <span
                className="flex-1 px-2 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--color-severity-high-bg)",
                  color: "var(--color-text-primary)",
                }}
              >
                {`// Line ${finding.lineStart} — ${finding.filePath.split("/").pop()}`}
              </span>
            </div>
            <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Code context is fetched from GitHub at read time. Open the file in GitHub to see the full source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
