import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getCategories } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { getTranslations } from "next-intl/server";

export default async function CategorySettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const categories = await getCategories();
  const t = await getTranslations("categoriesPage");

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbConfig"), href: `/repositories/${repoId}/config` },
          { label: t("breadcrumbCategories") },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        {t("title")}
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t("thCategory")}</th>
              <th>{t("thDescription")}</th>
              <th>{t("thRules")}</th>
              <th>{t("thDefaultSeverity")}</th>
              <th>{t("thStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className="cell-strong">{cat.name}</td>
                <td className="secondary">
                  {(cat.description ?? "").slice(0, 60)}
                  {(cat.description ?? "").length > 60 ? "…" : ""}
                </td>
                <td className="secondary">{cat._count.rules}</td>
                <td>
                  <SeverityBadge severity={cat.defaultSeverity} />
                </td>
                <td>
                  <span className="status">
                    <span className="dot" style={{ background: cat.isActive ? "var(--ok-dot)" : "var(--idle-dot)" }} />
                    {cat.isActive ? t("active") : t("inactive")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
