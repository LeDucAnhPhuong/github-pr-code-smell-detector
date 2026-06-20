import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getFrameworks } from "@/lib/db/admin";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default async function FrameworkSettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();
  const frameworks = await getFrameworks();

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: "Configuration", href: `/repositories/${repoId}/config` },
          { label: "Frameworks" },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 12 }}>
        Framework settings
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {frameworks.map((fw) => (
          <div key={fw.id} className="card card-body">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 className="h2">{fw.name}</h3>
              <span className={`switch ${fw.isActive ? "" : "off"}`} />
            </div>
            <div className="stack secondary" style={{ fontSize: 12 }}>
              <div>
                <span style={{ fontWeight: 500 }}>Extensions: </span>
                {fw.supportedExtensions.join(", ")}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontWeight: 500 }}>Active rules: </span>
                {fw._count.rules}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
