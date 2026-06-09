import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getFindings } from "@/lib/db/findings";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

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

  const findings = latestAnalysis
    ? await getFindings(latestAnalysis.id, session!.user.id)
    : [];

  const highCount = findings.filter((f) => f.severity === "error").length;
  const mediumCount = findings.filter((f) => f.severity === "warning").length;
  const lowCount = findings.filter((f) => f.severity === "info").length;

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
        { label: "Findings" },
      ]} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Findings</h1>
      </div>

      {/* Context bar */}
      <div
        className="flex items-center gap-4 px-4 py-2.5 rounded-lg border mb-4 text-xs"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <span style={{ color: "var(--color-text-secondary)" }}>{repo.fullName}</span>
        <span style={{ color: "var(--color-border)" }}>|</span>
        <span style={{ color: "var(--color-text-secondary)" }}>#{pr.prNumber} {pr.title}</span>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 mb-4">
        <span className="text-sm font-medium" style={{ color: "var(--color-severity-high-text)" }}>High {highCount}</span>
        <span className="text-sm font-medium" style={{ color: "var(--color-severity-medium-text)" }}>Medium {mediumCount}</span>
        <span className="text-sm font-medium" style={{ color: "var(--color-severity-low-text)" }}>Low {lowCount}</span>
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Rules triggered {new Set(findings.map((f) => f.ruleId)).size}</span>
      </div>

      {/* Findings table */}
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        {findings.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No findings detected.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["Severity", "Rule", "File", "Line", "Message", "Suggestion"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr
                  key={f.id}
                  className="border-b last:border-0 hover:bg-surface-muted cursor-pointer"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <td className="px-4 py-2.5"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>{f.ruleName}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono" style={{ color: "var(--color-primary)" }}>
                      {f.filePath.split("/").slice(-2).join("/")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{f.lineStart}</td>
                  <td className="px-4 py-2.5 text-xs max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {f.message.slice(0, 70)}{f.message.length > 70 ? "…" : ""}
                  </td>
                  <td className="px-4 py-2.5 text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                    <Link
                      href={`/repositories/${repoId}/pulls/${prId}/findings/${f.id}`}
                      className="hover:underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
