"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, RotateCcw, CheckCircle } from "lucide-react";

interface RepoConfigFormProps {
  repoId: string;
  initialConfig: Record<string, unknown>;
}

const DEFAULTS = {
  includePaths: "src/**/*.{js,jsx,ts,tsx}",
  excludePaths: "node_modules/**,dist/**,coverage/**",
  analyzeChangedOnly: true,
  publishPRComment: true,
  publishCheckAnnotations: false,
  warningOnlyMode: true,
  duplicateFeedback: "update",
};

export function RepoConfigForm({ repoId, initialConfig }: RepoConfigFormProps) {
  const pathname = usePathname();
  const t = useTranslations("repoConfig");
  const NAV = [
    { label: t("navGeneral"), href: "" },
    { label: t("navFrameworks"), href: "/frameworks" },
    { label: t("navRules"), href: "/rules" },
    { label: t("navCategories"), href: "/categories" },
  ];
  const [config, setConfig] = useState({
    includePaths: (initialConfig.includePaths as string) ?? DEFAULTS.includePaths,
    excludePaths: (initialConfig.excludePaths as string) ?? DEFAULTS.excludePaths,
    analyzeChangedOnly: (initialConfig.analyzeChangedOnly as boolean) ?? DEFAULTS.analyzeChangedOnly,
    publishPRComment: (initialConfig.publishPRComment as boolean) ?? DEFAULTS.publishPRComment,
    publishCheckAnnotations: (initialConfig.publishCheckAnnotations as boolean) ?? DEFAULTS.publishCheckAnnotations,
    warningOnlyMode: (initialConfig.warningOnlyMode as boolean) ?? DEFAULTS.warningOnlyMode,
    duplicateFeedback: (initialConfig.duplicateFeedback as string) ?? DEFAULTS.duplicateFeedback,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/repositories/${repoId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function Toggle({ label, field }: { label: string; field: keyof typeof config }) {
    const value = config[field] as boolean;
    return (
      <div className="between" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <button
          onClick={() => setConfig({ ...config, [field]: !value })}
          className={`switch ${value ? "" : "off"}`}
          aria-pressed={value}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, alignItems: "start" }}>
      {/* Left nav */}
      <div className="card" style={{ padding: 6 }}>
        {NAV.map(({ label, href }) => {
          const fullHref = `/repositories/${repoId}/config${href}`;
          const active = href === "" ? pathname === fullHref : pathname.startsWith(fullHref);
          return (
            <Link key={label} href={fullHref} className={`nav-item ${active ? "active" : ""}`}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <div className="card">
        <div className="card-head">
          <div className="row" style={{ gap: 8 }}>
            <h2 className="h2">{t("generalSettings")}</h2>
            {saved && (
              <span className="status" style={{ color: "var(--ok-ink)" }}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t("saved")}
              </span>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => setConfig({ ...DEFAULTS })} className="btn btn-secondary btn-sm">
              <RotateCcw className="w-3 h-3" />
              {t("discard")}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm" style={saving ? { opacity: 0.5 } : undefined}>
              <Save className="w-3 h-3" />
              {saving ? t("saving") : t("saveConfig")}
            </button>
          </div>
        </div>

        <div className="card-body stack">
          {/* Analysis scope */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              {t("analysisScope")}
            </p>
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <label className="field-label">{t("includePaths")}</label>
                <input
                  className="input mono"
                  value={config.includePaths}
                  onChange={(e) => setConfig({ ...config, includePaths: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">{t("excludePaths")}</label>
                <input
                  className="input mono"
                  value={config.excludePaths}
                  onChange={(e) => setConfig({ ...config, excludePaths: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              {t("behavior")}
            </p>
            <Toggle label={t("analyzeChangedOnly")} field="analyzeChangedOnly" />
            <Toggle label={t("publishPRComment")} field="publishPRComment" />
            <Toggle label={t("publishCheckAnnotations")} field="publishCheckAnnotations" />
            <Toggle label={t("warningOnlyMode")} field="warningOnlyMode" />
          </div>

          {/* Duplicate feedback */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              {t("duplicateFeedback")}
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {[
                { value: "update", label: t("dupUpdate") },
                { value: "new", label: t("dupNew") },
              ].map(({ value, label }) => (
                <label key={value} className="row" style={{ gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    value={value}
                    checked={config.duplicateFeedback === value}
                    onChange={() => setConfig({ ...config, duplicateFeedback: value })}
                  />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
