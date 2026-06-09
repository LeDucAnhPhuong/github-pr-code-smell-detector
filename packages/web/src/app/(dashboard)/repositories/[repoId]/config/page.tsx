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
    <div className="max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Configuration" },
      ]} />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Repository Configuration</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Configure rule thresholds, severity, and analysis scope for {repo.fullName}.
          </p>
        </div>
      </div>
      <RepoConfigForm repoId={repoId} initialConfig={config} />
    </div>
  );
}
