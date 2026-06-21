import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getTranslations } from "next-intl/server";

const FILE_STATUS_DOT: Record<string, string> = {
  ANALYZED: "var(--ok-dot)",
  DIAGNOSTIC: "var(--fail-dot)",
  SKIPPED: "var(--idle-dot)",
};

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

  const t = await getTranslations("filesPage");

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: `#${pr.prNumber}`, href: `/repositories/${repoId}/pulls/${prId}` },
          { label: t("breadcrumbChangedFiles") },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        {t("title")}
      </h1>

      <div className="row" style={{ gap: 18, marginBottom: 16, fontSize: 12.5 }}>
        <span className="secondary">{t("changedFilesCount", { count: files.length })}</span>
        <span className="status">
          <span className="dot" style={{ background: "var(--ok-dot)" }} />
          {t("analyzedCount", { count: analyzed })}
        </span>
        <span className="muted">{t("skippedCount", { count: skipped })}</span>
        {diagnostics > 0 && (
          <span className="status">
            <span className="dot" style={{ background: "var(--fail-dot)" }} />
            {t("diagnosticsCount", { count: diagnostics })}
          </span>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {files.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("noFileData")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("thFile")}</th>
                <th>{t("thType")}</th>
                <th>{t("thStatus")}</th>
                <th>+</th>
                <th>−</th>
                <th>{t("thFindings")}</th>
                <th>{t("thParser")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className="code">{f.filePath.split("/").slice(-2).join("/")}</span>
                  </td>
                  <td className="secondary">{f.fileType ?? "—"}</td>
                  <td>
                    <span className="status">
                      <span className="dot" style={{ background: FILE_STATUS_DOT[f.status] ?? "var(--idle-dot)" }} />
                      {t(`status_${f.status}`)}
                    </span>
                  </td>
                  <td style={{ color: "var(--ok-ink)" }}>+{f.additions}</td>
                  <td style={{ color: "var(--sev-high-ink)" }}>-{f.deletions}</td>
                  <td className="secondary">{f.findingsCount > 0 ? f.findingsCount : "—"}</td>
                  <td style={{ color: f.parserResult === "OK" ? "var(--ok-ink)" : "var(--sev-high-ink)" }}>
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
