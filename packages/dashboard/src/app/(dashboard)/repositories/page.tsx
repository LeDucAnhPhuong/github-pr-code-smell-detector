import { auth } from "@/lib/auth";
import { getRepositories } from "@/lib/db/repositories";
import Link from "next/link";
import { GitBranch, Github } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RepositoriesTable, type RepoRow } from "@/components/repositories/RepositoriesTable";
import { relativeTime } from "@/lib/relative-time";

function InstallLink({ label }: { label: string }) {
  return (
    <Link href="/setup" className="btn btn-primary">
      <Github className="w-4 h-4" />
      {label}
    </Link>
  );
}

export default async function RepositoriesPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [repos, t, tTime] = await Promise.all([
    getRepositories(userId),
    getTranslations("reposPage"),
    getTranslations("time"),
  ]);

  const rows: RepoRow[] = repos.map((repo) => ({
    id: repo.id,
    fullName: repo.fullName,
    language: repo.language ?? "—",
    visibility: repo.isPrivate ? t("private") : t("public"),
    defaultBranch: repo.defaultBranch,
    openPRs: repo.pullRequests.length,
    updatedAtMs: new Date(repo.updatedAt).getTime(),
    updatedAtLabel: relativeTime(repo.updatedAt, tTime),
  }));

  return (
    <div className="page-w">
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">{t("title")}</h1>
        <InstallLink label={t("installManage")} />
      </div>

      {repos.length === 0 ? (
        <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>
          <GitBranch className="w-7 h-7" style={{ margin: "0 auto 12px", color: "var(--ink-3)" }} />
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{t("noReposTitle")}</p>
          <p className="secondary" style={{ margin: "0 0 16px", fontSize: 12.5 }}>
            {t("noReposDesc")}
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <InstallLink label={t("installApp")} />
          </div>
        </div>
      ) : (
        <RepositoriesTable rows={rows} />
      )}
    </div>
  );
}
