"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Github, Check } from "lucide-react";
import { connectRepository, type ConnectableRepo } from "@/lib/actions/connect";

export function ConnectRepoList({ repos }: { repos: ConnectableRepo[] }) {
  const t = useTranslations("connectRepo");
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, string>>({});

  const q = search.toLowerCase();
  const visible = repos.filter((r) => !q || r.fullName.toLowerCase().includes(q));

  function connect(repo: ConnectableRepo) {
    setBusyId(repo.githubId);
    startTransition(async () => {
      const res = await connectRepository({ githubId: repo.githubId, installationId: repo.installationId, consent });
      setBusyId(null);
      if (res.ok) {
        setResults((m) => ({ ...m, [repo.githubId]: t("connectedOk", { framework: res.framework ?? "" }) }));
        router.refresh();
      } else {
        setResults((m) => ({ ...m, [repo.githubId]: res.message ?? res.code ?? "error" }));
      }
    });
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-body" style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--r)", background: "transparent", color: "var(--ink)" }}
        />
        <label className="row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--ink-2)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-3.5 h-3.5" />
          <span>{t("consentLabel")}</span>
        </label>
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("noReposFound")}</div>
      ) : (
        <table className="table">
          <tbody>
            {visible.map((r) => {
              const isConnected = r.connectionState !== null;
              const msg = results[r.githubId];
              return (
                <tr key={r.githubId}>
                  <td style={{ width: 24 }}>
                    <Github className="w-4 h-4" style={{ color: "var(--ink-3)" }} />
                  </td>
                  <td>
                    <span className="cell-strong">{r.fullName}</span>
                    {msg && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{msg}</div>}
                  </td>
                  <td className="secondary">{r.isPrivate ? t("private") : t("public")}</td>
                  <td style={{ textAlign: "right" }}>
                    {isConnected ? (
                      <span className="status">
                        <span className="dot" style={{ background: "var(--ok-dot)" }} />
                        {t("connected")}
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!consent || pending}
                        style={!consent || pending ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        onClick={() => connect(r)}
                      >
                        {busyId === r.githubId ? t("connecting") : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            {t("connectButton")}
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
