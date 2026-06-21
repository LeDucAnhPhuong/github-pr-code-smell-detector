import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getTranslations } from "next-intl/server";
import { relativeTime } from "@/lib/relative-time";

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

  const t = await getTranslations("pullsPage");
  const tStatus = await getTranslations("status");
  const tTime = await getTranslations("time");

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
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbPulls") },
        ]}
      />
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">{t("title")}</h1>
        <a href={`https://github.com/${repo.fullName}/pulls`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          {t("openOnGithub")}
        </a>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {pullRequests.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
            {t("noPulls")}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thPR")}</th>
                <th>{t("thAuthor")}</th>
                <th>{t("thSource")}</th>
                <th>{t("thTarget")}</th>
                <th>{t("thLatestAnalysis")}</th>
                <th>{t("thFindings")}</th>
                <th>{t("thUpdated")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pullRequests.map((pr) => {
                const latest = pr.analyses[0];
                const findingsCount = latest?.findings.length ?? 0;
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
                          {tStatus(latest.status)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="secondary">{latest?.status === "COMPLETED" ? `${findingsCount}` : "—"}</td>
                    <td className="muted">
                      {relativeTime(pr.updatedAt, tTime)}
                    </td>
                    <td>
                      <Link href={`/repositories/${repoId}/pulls/${pr.id}`} className="link">
                        {t("view")}
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
