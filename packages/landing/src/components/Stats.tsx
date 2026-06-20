const stats = [
  { figure: "6", label: "React checks, configurable per repo" },
  { figure: "3", label: "Severity levels: High, Medium, Low" },
  { figure: "Diff", label: "Scope: only the lines a PR changes" },
  { figure: "0", label: "Source files sent to third parties in MVP mode" },
];

export function Stats() {
  return (
    <section className="lp-invert lp-tex lp-tex-vlines lp-section">
      <div className="lp-container">
        <dl className="lp-stats">
          {stats.map((s) => (
            <div key={s.label} className="lp-stat">
              <dt className="lp-display" style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)", lineHeight: 1 }}>
                {s.figure}
              </dt>
              <dd className="lp-body" style={{ margin: "1rem 0 0", maxWidth: "22ch" }}>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
