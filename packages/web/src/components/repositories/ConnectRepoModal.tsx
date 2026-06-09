"use client";

import { useState } from "react";
import { Plus, X, Search, Github, AlertCircle } from "lucide-react";

interface GithubRepo {
  id: number;
  full_name: string;
  private: boolean;
  language: string | null;
}

interface ConnectRepoModalProps {
  buttonLabel?: string;
}

export function ConnectRepoModal({ buttonLabel = "Connect repository" }: ConnectRepoModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRepos(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/github-search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setRepos(json.data ?? []);
    } catch {
      setError("Failed to load GitHub repositories. Check your GitHub permissions.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      for (const repoId of selected) {
        const repo = repos.find((r) => r.id === repoId)!;
        const [owner, name] = repo.full_name.split("/");
        const res = await fetch("/api/repositories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubId: repo.id, owner, name, fullName: repo.full_name, isPrivate: repo.private, language: repo.language }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
      }
      setOpen(false);
      setSelected([]);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect repository.");
    } finally {
      setConnecting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); fetchRepos(""); }}
        className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md text-white transition-colors"
        style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
      >
        <Plus className="w-4 h-4" />
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="relative w-full max-w-lg rounded-lg border shadow-lg"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          borderRadius: "var(--radius-card)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Connect Repository
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-primary transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div
            className="flex items-center gap-2 rounded-md border px-3 py-2"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            <input
              type="text"
              placeholder="Search GitHub repositories…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); fetchRepos(e.target.value); }}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-5 my-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs"
            style={{ backgroundColor: "var(--color-severity-high-bg)", color: "var(--color-severity-high-text)" }}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* Repo list */}
        <div
          className="mx-5 my-2 rounded-md border overflow-y-auto"
          style={{ borderColor: "var(--color-border)", maxHeight: "240px" }}
        >
          {loading ? (
            <div className="p-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              Loading…
            </div>
          ) : repos.length === 0 ? (
            <div className="p-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              No repositories found.
            </div>
          ) : (
            repos.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-muted border-b last:border-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={(e) =>
                    setSelected(e.target.checked ? [...selected, r.id] : selected.filter((s) => s !== r.id))
                  }
                  className="w-3.5 h-3.5"
                />
                <Github className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {r.full_name}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-muted)" }}
                >
                  {r.private ? "Private" : "Public"}
                </span>
                {r.language && (
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {r.language}
                  </span>
                )}
              </label>
            ))
          )}
        </div>

        {/* Permission note */}
        <p className="px-5 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Repository access is scoped to your authorized GitHub permissions.
        </p>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => setOpen(false)}
            className="text-sm px-3 py-2 rounded-md border transition-colors"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
              borderRadius: "var(--radius-card)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={selected.length === 0 || connecting}
            className="text-sm px-3 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
          >
            {connecting ? "Connecting…" : `Connect selected (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
