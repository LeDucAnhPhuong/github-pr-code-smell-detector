import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getReports } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Clock } from "lucide-react";

export default async function ReportsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const reports = await getReports(session!.user.id, repoId);

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Reports" },
      ]} />
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Analysis Reports</h1>
      <div className="rounded-lg border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}>
        {reports.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No reports yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["Report", "Pull Request", "Status", "Findings", "Created"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const elapsed = Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000);
                return (
                  <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/repositories/${repoId}/reports/${r.id}`} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
                        {r.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      #{r.prAnalysis.pullRequest.prNumber} {r.prAnalysis.pullRequest.title.slice(0, 30)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: r.status === "PUBLISHED" ? "#e6f4ea" : r.status === "FAILED" ? "#ffebe9" : "#f0f3f6",
                          color: r.status === "PUBLISHED" ? "#1a7f37" : r.status === "FAILED" ? "#cf222e" : "#57606a",
                          borderRadius: "var(--radius-badge)",
                        }}
                      >
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {r.prAnalysis.findings.length}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}
                      </span>
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
