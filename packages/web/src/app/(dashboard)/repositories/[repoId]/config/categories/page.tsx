import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getCategories } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

export default async function CategorySettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const categories = await getCategories();

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Configuration", href: `/repositories/${repoId}/config` },
          { label: "Categories" },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        Category settings
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Rules</th>
              <th>Default severity</th>
              <th>Status</th>
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
                    {cat.isActive ? "Active" : "Inactive"}
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
