import { GitPullRequest } from "lucide-react";

// A real, honest sample of MergeTrack's output — built from the actual rule
// messages the analyzer emits. Labeled as a representative sample, not a mock
// screenshot. Severities here are illustrative of how findings are ranked.
const sample = [
  { sev: "high" as const, label: "High", file: "src/Dashboard.tsx", line: 42, msg: "Component spans 318 lines. Split it into smaller, focused components." },
  { sev: "med" as const, label: "Medium", file: "src/Filters.tsx", line: 11, msg: "Component has 11 props (max: 7). Group related props into an object." },
  { sev: "med" as const, label: "Medium", file: "src/Chart.tsx", line: 64, msg: "12 inline functions in JSX. Hoist handlers to stable references." },
  { sev: "low" as const, label: "Low", file: "src/Row.tsx", line: 8, msg: "JSX nests 6 levels deep. Extract the inner branch into a child." },
];

const chipClass = { high: "lp-chip lp-chip-high", med: "lp-chip lp-chip-med", low: "lp-chip lp-chip-low" };

export function FindingsPreview() {
  return (
    <div className="lp-card" style={{ borderColor: "var(--ink)", borderWidth: 2 }} aria-label="Sample MergeTrack findings">
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--border)" }}>
        <GitPullRequest size={16} strokeWidth={1.5} />
        <span className="lp-mono" style={{ fontSize: "0.8rem" }}>PR #128 · feat/reporting-view</span>
        <span className="lp-mono lp-muted" style={{ fontSize: "0.72rem", marginLeft: "auto" }}>sample output</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sample.map((f, i) => (
          <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", padding: "0.85rem 1.1rem", borderBottom: i < sample.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span className={chipClass[f.sev]}>{f.label}</span>
            <div>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>{f.msg}</p>
              <p className="lp-mono lp-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.74rem" }}>
                {f.file}:{f.line}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
