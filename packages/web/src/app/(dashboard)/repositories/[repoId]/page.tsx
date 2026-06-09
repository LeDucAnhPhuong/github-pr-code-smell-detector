import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExternalLink, GitPullRequest, CheckCircle, Settings, FileText, Clock } from "lucide-react";

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
      </div>
      <div className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

export default async function RepoDetailPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const [openPRCount, latestAnalysis, findingsCount] = await Promise.all([
    prisma.pullRequest.count({ where: { repositoryId: repo.id, state: "OPEN" } }),
    prisma.prAnalysis.findFirst({
      where: { pullRequest: { repositoryId: repo.id } },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
    prisma.finding.count({
      where: {
        prAnalysis: {
          pullRequest: { repositoryId: repo.id },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
    }),
  ]);

  const pullRequests = await prisma.pullRequest.findMany({
    where: { repositoryId: repo.id },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1, include: { findings: { select: { severity: true } } } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Repositories", href: "/repositories" }, { label: repo.fullName }]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{repo.fullName}</h1>
            <a
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-text-muted)" }}
              title="Open on GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: "#e6f4ea", color: "#1a7f37", borderRadius: "var(--radius-badge)" }}
            >
              Connected
            </span>
          </div>
          {repo.language && (
            <span
              className="inline-flex items-center text-xs px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              {repo.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/repositories/${repoId}/config`}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border transition-colors"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
          >
            <Settings className="w-3.5 h-3.5" />
            Configure rules
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open PRs" value={openPRCount} icon={GitPullRequest} />
        <MetricCard label="Latest Analysis" value={latestAnalysis?.status ?? "—"} icon={CheckCircle} />
        <MetricCard label="Active Rules" value={6} icon={Settings} />
        <MetricCard label="Findings last 7 days" value={findingsCount} icon={FileText} />
      </div>

      {/* Pull Requests tab */}
      <div
        className="rounded-lg border"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center gap-1 px-4 pt-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          {["Pull Requests", "Reports", "Configuration"].map((tab, i) => (
            <Link
              key={tab}
              href={i === 0 ? `/repositories/${repoId}/pulls` : i === 1 ? `/repositories/${repoId}/reports` : `/repositories/${repoId}/config`}
              className="px-3 py-2 text-sm border-b-2 -mb-px transition-colors"
              style={{
                borderColor: i === 0 ? "var(--color-primary)" : "transparent",
                color: i === 0 ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
            >
              {tab}
            </Link>
          ))}
        </div>

        {pullRequests.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No pull requests yet. Sync pull requests from GitHub to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                {["PR", "Author", "Branch", "Latest Analysis", "Findings", "Updated", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pullRequests.map((pr) => {
                const latest = pr.analyses[0];
                const highCount = latest?.findings.filter((f) => f.severity === "error").length ?? 0;
                const elapsed = Math.round((Date.now() - new Date(pr.updatedAt).getTime()) / 60000);
                return (
                  <tr key={pr.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
                        #{pr.prNumber} {pr.title.slice(0, 35)}{pr.title.length > 35 ? "…" : ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{pr.author}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>
                        {pr.sourceBranch}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium`} style={{
                          backgroundColor: latest.status === "COMPLETED" ? "#e6f4ea" : latest.status === "FAILED" ? "#ffebe9" : latest.status === "RUNNING" ? "#ddf4ff" : "#f0f3f6",
                          color: latest.status === "COMPLETED" ? "#1a7f37" : latest.status === "FAILED" ? "#cf222e" : latest.status === "RUNNING" ? "#0969da" : "#57606a",
                          borderRadius: "var(--radius-badge)",
                        }}>
                          {latest.status.charAt(0) + latest.status.slice(1).toLowerCase()}
                        </span>
                      ) : <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {latest ? `${latest.findings.length} (${highCount} high)` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsed < 1 ? "now" : elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="hover:underline" style={{ color: "var(--color-primary)" }}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
