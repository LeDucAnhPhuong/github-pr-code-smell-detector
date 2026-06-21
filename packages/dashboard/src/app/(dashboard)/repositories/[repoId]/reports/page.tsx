import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getReports } from "@/lib/db/reports";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getTranslations } from "next-intl/server";
import { relativeTime } from "@/lib/relative-time";

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

  const t = await getTranslations("reportsPage");
  const tReportStatus = await getTranslations("reportStatus");
  const tTime = await getTranslations("time");

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbReports") },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        {t("title")}
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        {reports.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("noReports")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thReport")}</th>
                <th>{t("thPullRequest")}</th>
                <th>{t("thStatus")}</th>
                <th>{t("thFindings")}</th>
                <th>{t("thCreated")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
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
                        {tReportStatus(r.status)}
                      </span>
                    </td>
                    <td className="secondary">{r.prAnalysis.findings.length}</td>
                    <td className="muted">{relativeTime(r.createdAt, tTime)}</td>
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
