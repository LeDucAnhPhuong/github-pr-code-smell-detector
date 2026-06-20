import { auth } from "@/lib/auth";
import { getRepositories } from "@/lib/db/repositories";
import Link from "next/link";
import { GitBranch, Github } from "lucide-react";
import { RepositoriesTable, type RepoRow } from "@/components/repositories/RepositoriesTable";

function InstallLink({ label = "Cài / quản lý GitHub App" }: { label?: string }) {
  return (
    <Link href="/setup" className="btn btn-primary">
      <Github className="w-4 h-4" />
      {label}
    </Link>
  );
}

function relative(date: Date): string {
  const m = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function RepositoriesPage() {
  const session = await auth();
  const userId = session!.user.id;
  const repos = await getRepositories(userId);

  const rows: RepoRow[] = repos.map((repo) => ({
    id: repo.id,
    fullName: repo.fullName,
    language: repo.language ?? "—",
    visibility: repo.isPrivate ? "Private" : "Public",
    defaultBranch: repo.defaultBranch,
    openPRs: repo.pullRequests.length,
    updatedAtMs: new Date(repo.updatedAt).getTime(),
    updatedAtLabel: relative(repo.updatedAt),
  }));

  return (
    <div className="page-w">
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">Repositories</h1>
        <InstallLink />
      </div>

      {repos.length === 0 ? (
        <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>
          <GitBranch className="w-7 h-7" style={{ margin: "0 auto 12px", color: "var(--ink-3)" }} />
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>No repositories connected</p>
          <p className="secondary" style={{ margin: "0 0 16px", fontSize: 12.5 }}>
            Cài GitHub App và chọn repo để bắt đầu phân tích Pull Request — không cần file workflow.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <InstallLink label="Cài GitHub App" />
          </div>
        </div>
      ) : (
        <RepositoriesTable rows={rows} />
      )}
    </div>
  );
}
