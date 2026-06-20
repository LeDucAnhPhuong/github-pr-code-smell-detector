import { getCategories } from "@/lib/db/admin";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 20 }}>
        Category catalog
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
