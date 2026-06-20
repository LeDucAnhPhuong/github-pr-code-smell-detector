import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ExternalLink, Settings } from "lucide-react";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card card-body">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em" }}>{value}</div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "var(--ok-dot)",
  RUNNING: "var(--run-dot)",
  FAILED: "var(--fail-dot)",
  PENDING: "var(--idle-dot)",
};

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
    <div className="page-w">
      <Breadcrumb items={[{ label: "Repositories", href: "/repositories" }, { label: repo.fullName }]} />

      {/* Header */}
      <div className="between" style={{ alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div className="row" style={{ gap: 10, marginBottom: 4 }}>
            <h1 className="h1">{repo.fullName}</h1>
            <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noopener noreferrer" className="muted" title="Open on GitHub">
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="status">
              <span className="dot" style={{ background: "var(--ok-dot)" }} />
              Connected
            </span>
          </div>
          {repo.language && <span className="badge badge-neutral">{repo.language}</span>}
        </div>
        <Link href={`/repositories/${repoId}/config`} className="btn btn-secondary btn-sm">
          <Settings className="w-3.5 h-3.5" />
          Configure rules
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <MetricCard label="Open PRs" value={openPRCount} />
        <MetricCard label="Latest analysis" value={latestAnalysis?.status ?? "—"} />
        <MetricCard label="Active rules" value={6} />
        <MetricCard label="Findings last 7 days" value={findingsCount} />
      </div>

      {/* Pull Requests */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="row" style={{ gap: 2, padding: "8px 12px 0", borderBottom: "1px solid var(--border)" }}>
          {["Pull Requests", "Reports", "Configuration"].map((tab, i) => (
            <Link
              key={tab}
              href={i === 0 ? `/repositories/${repoId}/pulls` : i === 1 ? `/repositories/${repoId}/reports` : `/repositories/${repoId}/config`}
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

        {pullRequests.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
            No pull requests yet. Sync pull requests from GitHub to get started.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PR</th>
                <th>Author</th>
                <th>Branch</th>
                <th>Latest analysis</th>
                <th>Findings</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pullRequests.map((pr) => {
                const latest = pr.analyses[0];
                const highCount = latest?.findings.filter((f) => f.severity === "error").length ?? 0;
                const elapsed = Math.round((Date.now() - new Date(pr.updatedAt).getTime()) / 60000);
                return (
                  <tr key={pr.id}>
                    <td>
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="link">
                        #{pr.prNumber} {pr.title.slice(0, 35)}
                        {pr.title.length > 35 ? "…" : ""}
                      </Link>
                    </td>
                    <td className="secondary">{pr.author}</td>
                    <td>
                      <span className="code">{pr.sourceBranch}</span>
                    </td>
                    <td>
                      {latest ? (
                        <span className="status">
                          <span className="dot" style={{ background: STATUS_DOT[latest.status] ?? "var(--idle-dot)" }} />
                          {latest.status.charAt(0) + latest.status.slice(1).toLowerCase()}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="secondary">{latest ? `${latest.findings.length} (${highCount} high)` : "—"}</td>
                    <td className="muted">
                      {elapsed < 1 ? "now" : elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}
                    </td>
                    <td>
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="link">
                        View
                      </Link>
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
