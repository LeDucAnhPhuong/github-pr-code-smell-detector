"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Search, Github, AlertCircle } from "lucide-react";
import { listConnectableRepos, connectRepository, type ConnectableRepo } from "@/lib/actions/connect";

interface ConnectRepoModalProps {
  buttonLabel?: string;
}

export function ConnectRepoModal({ buttonLabel }: ConnectRepoModalProps) {
  const t = useTranslations("connectRepo");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<ConnectableRepo[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejections, setRejections] = useState<string[]>([]);

  async function loadRepos() {
    setLoading(true);
    setError(null);
    try {
      const data = await listConnectableRepos();
      setRepos(data);
    } catch {
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!consent) {
      setError(t("consentRequired"));
      return;
    }
    setConnecting(true);
    setError(null);
    setRejections([]);
    const failures: string[] = [];
    try {
      for (const githubId of selected) {
        const repo = repos.find((r) => r.githubId === githubId)!;
        const res = await connectRepository({
          githubId: repo.githubId,
          installationId: repo.installationId,
          consent,
        });
        if (!res.ok) failures.push(`${repo.fullName}: ${res.message ?? res.code}`);
      }
      if (failures.length > 0) {
        setRejections(failures);
        setConnecting(false);
        return;
      }
      setOpen(false);
      setSelected([]);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errorConnect"));
    } finally {
      setConnecting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); loadRepos(); }} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        {buttonLabel ?? t("connectButton")}
      </button>
    );
  }

  const q = search.toLowerCase();
  const visible = repos.filter((r) => !q || r.fullName.toLowerCase().includes(q));

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
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {t("title")}
          </h2>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-primary transition-colors" style={{ color: "var(--color-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 my-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-severity-high-bg)", color: "var(--color-severity-high-text)" }}>
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* Per-repo rejections (e.g. unsupported framework / limit) */}
        {rejections.length > 0 && (
          <div className="mx-5 my-2 rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-severity-high-bg)", color: "var(--color-severity-high-text)" }}>
            <div className="font-semibold mb-1">{t("resultErrors")}</div>
            <ul className="list-disc pl-4">
              {rejections.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Repo list */}
        <div className="mx-5 my-2 rounded-md border overflow-y-auto" style={{ borderColor: "var(--color-border)", maxHeight: "240px" }}>
          {loading ? (
            <div className="p-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>{t("loading")}</div>
          ) : visible.length === 0 ? (
            <div className="p-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>{t("noReposFound")}</div>
          ) : (
            visible.map((r) => {
              const isConnected = r.connectionState !== null;
              return (
                <label
                  key={r.githubId}
                  className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0"
                  style={{ borderColor: "var(--color-border)", cursor: isConnected ? "not-allowed" : "pointer", opacity: isConnected ? 0.55 : 1 }}
                >
                  <input
                    type="checkbox"
                    disabled={isConnected}
                    checked={selected.includes(r.githubId)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, r.githubId] : selected.filter((s) => s !== r.githubId))}
                    className="w-3.5 h-3.5"
                  />
                  <Github className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                  <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>{r.fullName}</span>
                  {isConnected && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-muted)" }}>
                      {t("connected")}
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-text-muted)" }}>
                    {r.isPrivate ? t("private") : t("public")}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Consent (plan 01 — mandatory) */}
        <label className="mx-5 my-2 flex items-start gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-3.5 h-3.5" />
          <span>{t("consentLabel")}</span>
        </label>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">{t("cancel")}</button>
          <button
            onClick={handleConnect}
            disabled={selected.length === 0 || connecting || !consent}
            className="btn btn-primary btn-sm"
            style={selected.length === 0 || connecting || !consent ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            {connecting ? t("connecting") : t("connectSelected", { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
