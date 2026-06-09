import { auth } from "@/lib/auth";
import { getRepositories } from "@/lib/db/repositories";
import Link from "next/link";
import { GitBranch, Plus, GitPullRequest, Clock, AlertTriangle } from "lucide-react";
import { ConnectRepoModal } from "@/components/repositories/ConnectRepoModal";

function StatusBadge({ label, color }: { label: string; color: "green" | "red" | "gray" }) {
  const colors = {
    green: { bg: "#e6f4ea", text: "#1a7f37" },
    red: { bg: "#ffebe9", text: "#cf222e" },
    gray: { bg: "#f0f3f6", text: "#57606a" },
  };
  const c = colors[color];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text, borderRadius: "var(--radius-badge)" }}
    >
      {label}
    </span>
  );
}

export default async function RepositoriesPage() {
  const session = await auth();
  const userId = session!.user.id;
  const repos = await getRepositories(userId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Repositories
        </h1>
        <ConnectRepoModal />
      </div>

      {repos.length === 0 ? (
        <div
          className="rounded-lg border p-12 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <GitBranch className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            No repositories connected
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Connect a GitHub repository to start analyzing Pull Request changes.
          </p>
          <ConnectRepoModal buttonLabel="Connect repository" />
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)`, backgroundColor: "var(--color-surface-muted)" }}>
                {["Repository", "Language", "Status", "Open PRs", "Last updated", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repos.map((repo) => {
                const elapsed = Math.round((Date.now() - new Date(repo.updatedAt).getTime()) / 60000);
                return (
                  <tr
                    key={repo.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {repo.fullName}
                      </Link>
                      {repo.isPrivate && (
                        <span
                          className="ml-2 text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-muted)" }}
                        >
                          Private
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {repo.language ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label="Connected" color="green" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        <GitPullRequest className="w-3.5 h-3.5" />
                        {repo.pullRequests.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsed < 1 ? "just now" : elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="text-xs hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
