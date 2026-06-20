import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getFindings } from "@/lib/db/findings";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { FindingsTable, type FindingRow } from "@/components/findings/FindingsTable";

export default async function FindingsListPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const session = await auth();
  const { repoId, prId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const pr = await prisma.pullRequest.findFirst({ where: { id: prId, repositoryId: repo.id } });
  if (!pr) notFound();

  const latestAnalysis = await prisma.prAnalysis.findFirst({
    where: { pullRequestId: pr.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const findings = latestAnalysis ? await getFindings(latestAnalysis.id, session!.user.id) : [];

  const highCount = findings.filter((f) => f.severity === "error").length;
  const mediumCount = findings.filter((f) => f.severity === "warning").length;
  const lowCount = findings.filter((f) => f.severity === "info").length;
  const rulesTriggered = new Set(findings.map((f) => f.ruleId)).size;

  const rows: FindingRow[] = findings.map((f) => ({
    id: f.id,
    severity: f.severity,
    ruleName: f.ruleName,
    category: f.rule?.category?.name ?? "—",
    filePath: f.filePath,
    fileShort: f.filePath.split("/").slice(-2).join("/"),
    lineStart: f.lineStart,
    status: f.status,
  }));

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
          { label: "Findings" },
        ]}
      />

      <div className="between" style={{ marginBottom: 8 }}>
        <h1 className="h1">{pr.title}</h1>
      </div>

      {/* Summary strip */}
      <div className="row" style={{ gap: 18, marginBottom: 16, fontSize: 12.5 }}>
        <span className="status">
          <span className="dot" style={{ background: "var(--sev-high-dot)" }} />
          High {highCount}
        </span>
        <span className="status">
          <span className="dot" style={{ background: "var(--sev-med-dot)" }} />
          Medium {mediumCount}
        </span>
        <span className="status">
          <span className="dot" style={{ background: "var(--sev-low-dot)" }} />
          Low {lowCount}
        </span>
        <span className="muted">Rules triggered {rulesTriggered}</span>
      </div>

      {findings.length === 0 ? (
        <div className="card card-body" style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>
          No findings detected.
        </div>
      ) : (
        <FindingsTable rows={rows} repoId={repoId} prId={prId} />
      )}
    </div>
  );
}
