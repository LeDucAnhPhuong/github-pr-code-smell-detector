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
    <div className="max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: "Repositories", href: "/repositories" },
        { label: repo.fullName, href: `/repositories/${repoId}` },
        { label: "Configuration", href: `/repositories/${repoId}/config` },
        { label: "Frameworks" },
      ]} />
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Framework Settings</h1>
      <div className="grid grid-cols-3 gap-4">
        {frameworks.map((fw) => (
          <div
            key={fw.id}
            className="rounded-lg border p-4"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{fw.name}</h3>
              <div
                className="w-8 h-5 rounded-full flex items-center transition-colors cursor-pointer"
                style={{ backgroundColor: fw.isActive ? "var(--color-primary)" : "var(--color-border)" }}
              >
                <span
                  className="inline-block h-4 w-4 ml-0.5 rounded-full bg-white transition-transform"
                  style={{ transform: fw.isActive ? "translateX(12px)" : "translateX(0)" }}
                />
              </div>
            </div>
            <div className="space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <div>
                <span className="font-medium">Extensions: </span>
                {fw.supportedExtensions.join(", ")}
              </div>
              <div>
                <span className="font-medium">Active rules: </span>
                {fw._count.rules}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
