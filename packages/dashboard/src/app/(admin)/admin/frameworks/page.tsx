import { getFrameworks } from "@/lib/db/admin";

export default async function AdminFrameworksPage() {
  const frameworks = await getFrameworks();

  return (
    <div className="page-w">
      <h1 className="h1" style={{ marginBottom: 20 }}>
        Framework catalog
      </h1>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Extensions</th>
              <th>Active rules</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {frameworks.map((fw) => (
              <tr key={fw.id}>
                <td className="cell-strong">{fw.name}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {fw.supportedExtensions.map((ext) => (
                      <span key={ext} className="code">
                        {ext}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="secondary">{fw._count.rules}</td>
                <td>
                  <span className="status">
                    <span className="dot" style={{ background: fw.isActive ? "var(--ok-dot)" : "var(--idle-dot)" }} />
                    {fw.isActive ? "Active" : "Inactive"}
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
