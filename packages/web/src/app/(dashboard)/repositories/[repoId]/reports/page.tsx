import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getReports } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

const REPORT_DOT: Record<string, string> = {
  PUBLISHED: "var(--ok-dot)",
  FAILED: "var(--fail-dot)",
  DRAFT: "var(--idle-dot)",
};

export default async function ReportsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const reports = await getReports(session!.user.id, repoId);

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Reports" },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        Analysis reports
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        {reports.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>No reports yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Pull request</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const elapsed = Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/repositories/${repoId}/reports/${r.id}`} className="link mono">
                        {r.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="secondary">
                      #{r.prAnalysis.pullRequest.prNumber} {r.prAnalysis.pullRequest.title.slice(0, 30)}
                    </td>
                    <td>
                      <span className="status">
                        <span className="dot" style={{ background: REPORT_DOT[r.status] ?? "var(--idle-dot)" }} />
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="secondary">{r.prAnalysis.findings.length}</td>
                    <td className="muted">{elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}</td>
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
