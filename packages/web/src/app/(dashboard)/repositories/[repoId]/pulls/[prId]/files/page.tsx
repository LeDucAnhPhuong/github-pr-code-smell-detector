import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default async function ChangedFilesPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const session = await auth();
  const { repoId, prId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const pr = await prisma.pullRequest.findFirst({ where: { id: prId, repositoryId: repo.id } });
  if (!pr) notFound();

  const latestAnalysis = await prisma.prAnalysis.findFirst({
    where: { pullRequestId: pr.id },
    orderBy: { createdAt: "desc" },
    include: { changedFiles: { orderBy: { filePath: "asc" } } },
  });

  const files = latestAnalysis?.changedFiles ?? [];
  const analyzed = files.filter((f) => f.status === "ANALYZED").length;
  const skipped = files.filter((f) => f.status === "SKIPPED").length;
  const diagnostics = files.filter((f) => f.status === "DIAGNOSTIC").length;

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
        { label: "Changed Files" },
      ]} />
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Changed Files</h1>

      {/* Summary */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <span style={{ color: "var(--color-text-secondary)" }}>{files.length} changed files</span>
        <span style={{ color: "var(--color-success)" }}>{analyzed} analyzed</span>
        <span style={{ color: "var(--color-text-muted)" }}>{skipped} skipped</span>
        {diagnostics > 0 && <span style={{ color: "var(--color-danger)" }}>{diagnostics} parser diagnostic{diagnostics !== 1 ? "s" : ""}</span>}
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        {files.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No file data available.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["File", "Type", "Status", "+", "−", "Findings", "Parser"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--color-primary)" }}>
                    {f.filePath.split("/").slice(-2).join("/")}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{f.fileType ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: f.status === "ANALYZED" ? "#e6f4ea" : f.status === "DIAGNOSTIC" ? "#ffebe9" : "#f0f3f6",
                        color: f.status === "ANALYZED" ? "#1a7f37" : f.status === "DIAGNOSTIC" ? "#cf222e" : "#57606a",
                        borderRadius: "var(--radius-badge)",
                      }}
                    >
                      {f.status.charAt(0) + f.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-success)" }}>+{f.additions}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-danger)" }}>-{f.deletions}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{f.findingsCount > 0 ? f.findingsCount : "—"}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: f.parserResult === "OK" ? "var(--color-success)" : "var(--color-danger)" }}>
                    {f.parserResult ?? "—"}
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
