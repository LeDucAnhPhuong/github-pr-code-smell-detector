import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Clock } from "lucide-react";

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
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Repositories", href: "/repositories" }, { label: repo.fullName, href: `/repositories/${repoId}` }, { label: "Pull Requests" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Pull Requests</h1>
        <div className="flex gap-2">
          <a
            href={`https://github.com/${repo.fullName}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
          >
            Open on GitHub
          </a>
        </div>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        {pullRequests.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No pull requests found. Webhook events will create PR entries automatically.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["PR", "Author", "Source branch", "Target branch", "Latest Analysis", "Findings", "Updated", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pullRequests.map((pr) => {
                const latest = pr.analyses[0];
                const findingsCount = latest?.findings.length ?? 0;
                const elapsed = Math.round((Date.now() - new Date(pr.updatedAt).getTime()) / 60000);
                return (
                  <tr key={pr.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
                        #{pr.prNumber} {pr.title.slice(0, 40)}{pr.title.length > 40 ? "…" : ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{pr.author}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>
                        {pr.sourceBranch}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{pr.targetBranch}</td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                          backgroundColor: latest.status === "COMPLETED" ? "#e6f4ea" : latest.status === "FAILED" ? "#ffebe9" : latest.status === "RUNNING" ? "#ddf4ff" : "#f0f3f6",
                          color: latest.status === "COMPLETED" ? "#1a7f37" : latest.status === "FAILED" ? "#cf222e" : latest.status === "RUNNING" ? "#0969da" : "#57606a",
                          borderRadius: "var(--radius-badge)",
                        }}>
                          {latest.status.charAt(0) + latest.status.slice(1).toLowerCase()}
                        </span>
                      ) : <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {latest?.status === "COMPLETED" ? `${findingsCount}` : "—"}
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
