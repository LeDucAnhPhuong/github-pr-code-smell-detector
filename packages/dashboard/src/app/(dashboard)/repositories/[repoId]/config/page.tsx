import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RepoConfigForm } from "@/components/repositories/RepoConfigForm";
import { getTranslations } from "next-intl/server";

export default async function RepoConfigPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const t = await getTranslations("configPage");
  const config = (repo.config as Record<string, unknown>) ?? {};

  return (
    <div className="page-w">
      <Breadcrumb items={[
        { label: t("breadcrumbRepos"), href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: t("breadcrumbConfig") },
      ]} />
      <div style={{ marginBottom: 18 }}>
        <h1 className="h1">{t("title")}</h1>
        <p className="secondary" style={{ marginTop: 4, fontSize: 13 }}>
          {t("subtitle", { repo: repo.fullName })}
        </p>
      </div>
      <RepoConfigForm repoId={repoId} initialConfig={config} />
    </div>
  );
}
