"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import {
  createRepoRule,
  updateRepoRule,
  deleteRepoRule,
  toggleRepoRule,
  toggleSystemRule,
} from "@/lib/actions/repo-rules";
import type { RuleTemplate } from "@/lib/rules/templates";

export interface SystemRuleRow {
  id: string;
  name: string;
  framework: string;
  category: string;
  severity: "error" | "warning" | "info";
  enabled: boolean;
}

export interface CustomRuleRow {
  id: string;
  title: string;
  severity: "error" | "warning" | "info";
  appliesTo: string[];
  bodyMd: string;
  isActive: boolean;
}

export function RepoRulesManager({
  repoId,
  systemRules,
  customRules,
  templates,
}: {
  repoId: string;
  systemRules: SystemRuleRow[];
  customRules: CustomRuleRow[];
  templates: RuleTemplate[];
}) {
  const t = useTranslations("rulesPage");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; markdown: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setError(null);
    setEditing({ id: null, markdown: templates[0]?.markdown ?? "---\ntitle: \nseverity: warning\n---\n\n" });
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = editing.id
        ? await updateRepoRule(repoId, editing.id, editing.markdown)
        : await createRepoRule(repoId, editing.markdown);
      if (res.ok) setEditing(null);
      else setError(res.error ?? "Failed to save rule");
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* System rules */}
      <section>
        <h2 className="h2" style={{ marginBottom: 8 }}>{t("systemRulesTitle")}</h2>
        <p className="secondary" style={{ fontSize: 12.5, marginBottom: 10 }}>{t("systemRulesDesc")}</p>
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>{t("thRule")}</th>
                <th>{t("thCategory")}</th>
                <th>{t("thSeverity")}</th>
              </tr>
            </thead>
            <tbody>
              {systemRules.map((r) => (
                <tr key={r.id}>
                  <td style={{ width: 36 }}>
                    <button
                      onClick={() => startTransition(async () => { await toggleSystemRule(repoId, r.id, !r.enabled); })}
                      disabled={pending}
                      className={`check ${r.enabled ? "" : "empty"}`}
                      title={r.enabled ? t("disable") : t("enable")}
                      style={{ cursor: "pointer", border: "none" }}
                    >
                      {r.enabled && <Check width={10} height={10} color="#fff" />}
                    </button>
                  </td>
                  <td>
                    <div className="cell-strong">{r.name}</div>
                    <div className="muted mono" style={{ fontSize: 11.5 }}>{r.id}</div>
                  </td>
                  <td className="secondary">{r.category}</td>
                  <td><SeverityBadge severity={r.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Custom rules */}
      <section>
        <div className="between" style={{ alignItems: "center", marginBottom: 8 }}>
          <h2 className="h2">{t("customRulesTitle")}</h2>
          <button className="btn btn-primary btn-sm" onClick={openNew} disabled={pending}>
            <Plus className="w-3.5 h-3.5" />
            {t("addRule")}
          </button>
        </div>
        <p className="secondary" style={{ fontSize: 12.5, marginBottom: 10 }}>{t("customRulesDesc")}</p>

        {customRules.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center", padding: 28, fontSize: 13, color: "var(--ink-3)" }}>
            {t("noCustomRules")}
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>{t("thRule")}</th>
                  <th>{t("thSeverity")}</th>
                  <th>{t("thAppliesTo")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customRules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ width: 36 }}>
                      <button
                        onClick={() => startTransition(async () => { await toggleRepoRule(repoId, r.id, !r.isActive); })}
                        disabled={pending}
                        className={`check ${r.isActive ? "" : "empty"}`}
                        title={r.isActive ? t("disable") : t("enable")}
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        {r.isActive && <Check width={10} height={10} color="#fff" />}
                      </button>
                    </td>
                    <td className="cell-strong">{r.title}</td>
                    <td><SeverityBadge severity={r.severity} /></td>
                    <td className="secondary mono" style={{ fontSize: 11.5 }}>
                      {r.appliesTo.length ? r.appliesTo.join(", ") : t("global")}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        <button className="link" onClick={() => { setError(null); setEditing({ id: r.id, markdown: r.bodyMd }); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="link"
                          onClick={() => { if (confirm(t("confirmDelete"))) startTransition(async () => { await deleteRepoRule(repoId, r.id); }); }}
                          style={{ color: "var(--fail-dot)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card" style={{ width: "100%", maxWidth: 640 }}>
            <div className="card-head">
              <h2 className="h2">{editing.id ? t("editRule") : t("newRule")}</h2>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 10 }}>
              {!editing.id && templates.length > 0 && (
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="muted" style={{ fontSize: 12 }}>{t("templates")}:</span>
                  {templates.map((tpl) => (
                    <button key={tpl.name} className="badge badge-neutral" style={{ cursor: "pointer" }}
                      onClick={() => setEditing({ id: null, markdown: tpl.markdown })}>
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={editing.markdown}
                onChange={(e) => setEditing({ ...editing, markdown: e.target.value })}
                spellCheck={false}
                className="mono"
                style={{ width: "100%", minHeight: 280, fontSize: 12.5, padding: 12, borderRadius: "var(--r)", border: "1px solid var(--border)", background: "var(--code-bg)", color: "var(--ink)", whiteSpace: "pre", overflow: "auto" }}
              />
              {error && (
                <div style={{ fontSize: 12.5, color: "var(--fail-dot)" }}>{error}</div>
              )}
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)} disabled={pending}>{t("cancel")}</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? t("saving") : t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
