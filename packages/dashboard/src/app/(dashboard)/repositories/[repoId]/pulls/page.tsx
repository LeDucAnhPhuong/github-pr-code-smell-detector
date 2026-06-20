import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "var(--ok-dot)",
  RUNNING: "var(--run-dot)",
  FAILED: "var(--fail-dot)",
  PENDING: "var(--idle-dot)",
};

export default async function PRListPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const pullRequests = await prisma.pullRequest.findMany({
    where: { repositoryId: repo.id },
    orderBy: { updatedAt: "desc" },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { findings: { select: { severity: true } } },
      },
    },
  });

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Pull Requests" },
        ]}
      />
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">Pull Requests</h1>
        <a href={`https://github.com/${repo.fullName}/pulls`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          Open on GitHub
        </a>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {pullRequests.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
            No pull requests found. Webhook events will create PR entries automatically.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PR</th>
                <th>Author</th>
                <th>Source</th>
                <th>Target</th>
                <th>Latest analysis</th>
                <th>Findings</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pullRequests.map((pr) => {
                const latest = pr.analyses[0];
                const findingsCount = latest?.findings.length ?? 0;
                const elapsed = Math.round((Date.now() - new Date(pr.updatedAt).getTime()) / 60000);
                return (
                  <tr key={pr.id}>
                    <td>
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="link">
                        #{pr.prNumber} {pr.title.slice(0, 40)}
                        {pr.title.length > 40 ? "…" : ""}
                      </Link>
                    </td>
                    <td className="secondary">{pr.author}</td>
                    <td>
                      <span className="code">{pr.sourceBranch}</span>
                    </td>
                    <td className="secondary">{pr.targetBranch}</td>
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
                    <td className="secondary">{latest?.status === "COMPLETED" ? `${findingsCount}` : "—"}</td>
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
