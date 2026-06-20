import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RepoConfigForm } from "@/components/repositories/RepoConfigForm";

export default async function RepoConfigPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const config = (repo.config as Record<string, unknown>) ?? {};

  return (
    <div className="page-w">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Configuration" },
      ]} />
      <div style={{ marginBottom: 18 }}>
        <h1 className="h1">Repository configuration</h1>
        <p className="secondary" style={{ marginTop: 4, fontSize: 13 }}>
          Configure rule thresholds, severity, and analysis scope for {repo.fullName}.
        </p>
      </div>
      <RepoConfigForm repoId={repoId} initialConfig={config} />
    </div>
  );
}
