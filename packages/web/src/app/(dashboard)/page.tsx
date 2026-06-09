import { auth } from "@/lib/auth";
import { getDashboardStats, getRecentAnalyses } from "@/lib/db/analyses";
import { getHighSeverityFindings } from "@/lib/db/findings";
import { getRepositories } from "@/lib/db/repositories";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { GitBranch, GitPullRequest, AlertTriangle, Gauge, Clock, Plus } from "lucide-react";
import Link from "next/link";

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
}) {
  const card = (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide font-medium" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </span>
        <Icon className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
      </div>
      <div className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    COMPLETED: { bg: "#e6f4ea", color: "#1a7f37" },
    RUNNING: { bg: "#ddf4ff", color: "#0969da" },
    FAILED: { bg: "#ffebe9", color: "#cf222e" },
    PENDING: { bg: "#f0f3f6", color: "#57606a" },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: "var(--radius-badge)" }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [stats, recentAnalyses, highFindings, repos] = await Promise.all([
    getDashboardStats(userId),
    getRecentAnalyses(userId, 5),
    getHighSeverityFindings(userId, 4),
    getRepositories(userId),
  ]);

  const reposNeedingAttention = repos.filter(
    (r) => r.pullRequests.length > 0
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Dashboard
      </h1>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Connected Repositories"
          value={stats.repoCount}
          icon={GitBranch}
          href="/repositories"
        />
        <MetricCard
          label="Open Pull Requests"
          value={stats.openPRCount}
          icon={GitPullRequest}
        />
        <MetricCard
          label="Findings This Week"
          value={stats.findingsThisWeek}
          icon={AlertTriangle}
        />
        <MetricCard
          label="Analysis Quota Used"
          value={`${stats.quotaPercent}%`}
          icon={Gauge}
          href="/billing"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Recent PR Analyses — 2/3 width */}
        <div
          className="col-span-2 rounded-lg border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Recent PR Analyses
            </h2>
          </div>
          {recentAnalyses.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              No analyses yet.{" "}
              <Link href="/repositories" className="underline" style={{ color: "var(--color-primary)" }}>
                Connect a repository
              </Link>{" "}
              to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                  {["PR", "Repository", "Status", "Findings", "High", "Last run"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2 font-medium text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((a) => {
                  const highCount = a.findings?.filter((f) => f.severity === "error").length ?? 0;
                  const elapsed = Math.round(
                    (Date.now() - new Date(a.createdAt).getTime()) / 60000
                  );
                  return (
                    <tr
                      key={a.id}
                      className="border-b last:border-0 hover:bg-surface-muted transition-colors"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/repositories/${a.pullRequest.repositoryId}/pulls/${a.pullRequestId}`}
                          className="font-medium hover:underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          #{a.pullRequest.prNumber} {a.pullRequest.title.slice(0, 30)}
                          {a.pullRequest.title.length > 30 ? "…" : ""}
                        </Link>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                        {a.pullRequest.repository.fullName}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                        {a.status === "COMPLETED" ? `${a.findings?.length ?? 0}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {highCount > 0 ? (
                          <span style={{ color: "var(--color-danger)", fontWeight: 500 }}>{highCount}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {elapsed < 1 ? "now" : elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Subscription Usage */}
          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
              Subscription Usage
            </h2>
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>Analyses this month</span>
              <span>{stats.analysisUsed} / {stats.analysisQuota}</span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-surface-muted)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(stats.quotaPercent, 100)}%`,
                  backgroundColor: stats.quotaPercent > 80 ? "var(--color-danger)" : "var(--color-primary)",
                }}
              />
            </div>
            {stats.quotaPercent > 80 && (
              <p className="text-xs mt-2" style={{ color: "var(--color-danger)" }}>
                Over 80% quota used.{" "}
                <Link href="/billing/plans" className="underline">
                  Upgrade
                </Link>
              </p>
            )}
          </div>

          {/* High Severity Findings */}
          <div
            className="rounded-lg border flex-1"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                High Severity Findings
              </h2>
            </div>
            {highFindings.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
                No high severity findings
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {highFindings.map((f) => (
                  <li key={f.id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SeverityBadge severity="error" />
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {f.ruleName}
                      </span>
                    </div>
                    <div style={{ color: "var(--color-text-muted)" }} className="truncate">
                      {f.prAnalysis.pullRequest.repository.fullName}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Repositories needing attention */}
      {reposNeedingAttention.length > 0 && (
        <div
          className="rounded-lg border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Repositories needing attention
            </h2>
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {reposNeedingAttention.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/repositories/${r.id}`}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  {r.fullName}
                </Link>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {r.pullRequests.length} open PR{r.pullRequests.length !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {repos.length === 0 && (
        <div
          className="rounded-lg border p-12 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <GitBranch className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            No repositories connected
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Connect a GitHub repository to start analyzing Pull Request changes.
          </p>
          <Link
            href="/repositories"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md text-white"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
          >
            <Plus className="w-4 h-4" />
            Connect repository
          </Link>
        </div>
      )}
    </div>
  );
}
