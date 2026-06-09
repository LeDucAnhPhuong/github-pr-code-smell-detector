"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Save, RotateCcw, CheckCircle } from "lucide-react";

const NAV = [
  { label: "General", href: "" },
  { label: "Frameworks", href: "/frameworks" },
  { label: "Rules", href: "/rules" },
  { label: "Categories", href: "/categories" },
];

interface RepoConfigFormProps {
  repoId: string;
  initialConfig: Record<string, unknown>;
}

export function RepoConfigForm({ repoId, initialConfig }: RepoConfigFormProps) {
  const pathname = usePathname();
  const [config, setConfig] = useState({
    includePaths: (initialConfig.includePaths as string) ?? "src/**/*.{js,jsx,ts,tsx}",
    excludePaths: (initialConfig.excludePaths as string) ?? "node_modules/**,dist/**,coverage/**",
    analyzeChangedOnly: (initialConfig.analyzeChangedOnly as boolean) ?? true,
    publishPRComment: (initialConfig.publishPRComment as boolean) ?? true,
    publishCheckAnnotations: (initialConfig.publishCheckAnnotations as boolean) ?? false,
    warningOnlyMode: (initialConfig.warningOnlyMode as boolean) ?? true,
    duplicateFeedback: (initialConfig.duplicateFeedback as string) ?? "update",
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
      <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{label}</span>
        <button
          onClick={() => setConfig({ ...config, [field]: !value })}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          style={{ backgroundColor: value ? "var(--color-primary)" : "var(--color-border)" }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Left nav */}
      <div
        className="rounded-lg border p-2"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        {NAV.map(({ label, href }) => {
          const fullHref = `/repositories/${repoId}/config${href}`;
          const active = href === "" ? pathname === fullHref : pathname.startsWith(fullHref);
          return (
            <Link
              key={label}
              href={fullHref}
              className="block px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: active ? "var(--color-surface-muted)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <div className="col-span-3">
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
        >
          {/* Header actions */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>General Settings</h2>
              {saved && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-success)" }}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfig({ includePaths: "src/**/*.{js,jsx,ts,tsx}", excludePaths: "node_modules/**,dist/**,coverage/**", analyzeChangedOnly: true, publishPRComment: true, publishCheckAnnotations: false, warningOnlyMode: true, duplicateFeedback: "update" })}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-card)" }}
              >
                <RotateCcw className="w-3 h-3" />
                Discard changes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md text-white"
                style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-card)" }}
              >
                <Save className="w-3 h-3" />
                {saving ? "Saving…" : "Save configuration"}
              </button>
            </div>
          </div>

          {/* Analysis Scope */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>Analysis Scope</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Include paths</label>
                <input
                  type="text"
                  value={config.includePaths}
                  onChange={(e) => setConfig({ ...config, includePaths: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Exclude paths (comma-separated)</label>
                <input
                  type="text"
                  value={config.excludePaths}
                  onChange={(e) => setConfig({ ...config, excludePaths: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
                />
              </div>
            </div>
          </div>

          {/* Behavior toggles */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>Behavior</h3>
            <Toggle label="Analyze changed files only" field="analyzeChangedOnly" />
            <Toggle label="Publish PR comment" field="publishPRComment" />
            <Toggle label="Publish GitHub Check annotations" field="publishCheckAnnotations" />
            <Toggle label="Warning-only mode (never block PR)" field="warningOnlyMode" />
          </div>

          {/* Duplicate feedback */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>Duplicate Feedback</h3>
            <div className="space-y-2">
              {[
                { value: "update", label: "Update existing PR comment" },
                { value: "new", label: "Create new comment per run" },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={value}
                    checked={config.duplicateFeedback === value}
                    onChange={() => setConfig({ ...config, duplicateFeedback: value })}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
