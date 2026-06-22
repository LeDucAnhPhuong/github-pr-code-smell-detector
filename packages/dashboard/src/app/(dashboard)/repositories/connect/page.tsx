import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getTranslations } from "next-intl/server";
import { listConnectableRepos } from "@/lib/actions/connect";
import { ConnectRepoList } from "@/components/repositories/ConnectRepoList";

export default async function ConnectRepoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("connectRepo");
  const repos = await listConnectableRepos();

  return (
    <div className="page-w">
      <Breadcrumb items={[{ label: t("breadcrumbRepos"), href: "/repositories" }, { label: t("pageTitle") }]} />
      <h1 className="h1" style={{ marginBottom: 6 }}>
        {t("pageTitle")}
      </h1>
      <p className="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
        {t("pageDesc")}
      </p>
      <ConnectRepoList repos={repos} />
    </div>
  );
}
