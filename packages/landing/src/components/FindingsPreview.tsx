import { GitPullRequest } from "lucide-react";

// A real, honest sample of MergeTrack's output — built from the actual rule
// messages the analyzer emits. Labeled as a representative sample, not a mock
// screenshot. Severities here are illustrative of how findings are ranked.
type Sev = "high" | "med" | "low";

const sample: { sev: Sev; label: string; file: string; line: number; msg: string }[] = [
  { sev: "high", label: "High", file: "src/Dashboard.tsx", line: 42, msg: "Component spans 318 lines. Split it into smaller, focused components." },
  { sev: "med", label: "Medium", file: "src/Filters.tsx", line: 11, msg: "Component has 11 props (max: 7). Group related props into an object." },
  { sev: "med", label: "Medium", file: "src/Chart.tsx", line: 64, msg: "12 inline functions in JSX. Hoist handlers to stable references." },
  { sev: "low", label: "Low", file: "src/Row.tsx", line: 8, msg: "JSX nests 6 levels deep. Extract the inner branch into a child." },
];

const tally: { sev: Sev; label: string }[] = [
  { sev: "high", label: "1 high" },
  { sev: "med", label: "2 medium" },
  { sev: "low", label: "1 low" },
];

export function FindingsPreview() {
  return (
    <div className="lp-card" style={{ borderColor: "var(--ink)", borderWidth: 2 }} aria-label="Sample MergeTrack findings">
      <div className="lp-find-head">
        <GitPullRequest size={16} strokeWidth={1.5} />
        <span className="lp-mono" style={{ fontSize: "0.8rem", fontWeight: 600 }}>PR #128</span>
        <span className="lp-mono lp-muted" style={{ fontSize: "0.78rem" }}>feat/reporting-view</span>
        <span className="lp-mono lp-muted" style={{ fontSize: "0.68rem", marginLeft: "auto", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          sample output
        </span>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sample.map((f, i) => (
          <li key={i} className="lp-find-row">
            <span className={`lp-sev lp-sev-${f.sev}`}>
              <span className="lp-sev-dot" />
              {f.label}
            </span>
            <div>
              <p className="lp-find-msg">{f.msg}</p>
              <p className="lp-find-loc lp-mono">{f.file}:{f.line}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="lp-find-foot">
        <span className="lp-mono">4 findings</span>
        <span className="lp-find-tally lp-mono">
          {tally.map((t) => (
            <span key={t.sev}>
              <i style={{ background: `var(--sev-${t.sev}-ink)` }} />
              {t.label}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
