const checks = [
  { title: "Oversized components", body: "Flags React components that have grown past a healthy line count and should be split into smaller pieces." },
  { title: "Too many props", body: "Catches components taking more than seven props and suggests grouping related ones into a single object." },
  { title: "Too many state hooks", body: "Surfaces components juggling more useState hooks than they can clearly manage." },
  { title: "Deeply nested JSX", body: "Detects JSX nested far enough to hurt readability and points to the branch worth extracting." },
  { title: "Inline function overuse", body: "Points out event handlers defined inline in JSX that could be hoisted to stable references." },
  { title: "Mixed responsibilities", body: "Highlights components handling data, state, and presentation all at once." },
];

export function Checks() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-container lp-checks-grid">
        <div className="lp-checks-head">
          <p className="lp-eyebrow">The checks</p>
          <h2 className="lp-h2" style={{ marginTop: "1.25rem" }}>
            Six React maintainability checks, tuned for review.
          </h2>
          <p className="lp-body" style={{ marginTop: "1.5rem" }}>
            Each check ships with sensible defaults and is configurable per repository. Findings carry a
            severity and a concrete suggestion, so a review comment is actionable, not just a warning.
          </p>
        </div>

        <ul className="lp-checks-list">
          {checks.map((c) => (
            <li key={c.title} className="lp-card lp-card-hover lp-check-row">
              <h3 className="lp-h3" style={{ fontSize: "1.1rem" }}>{c.title}</h3>
              <p className="lp-body" style={{ marginTop: "0.4rem", fontSize: "0.92rem" }}>{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
