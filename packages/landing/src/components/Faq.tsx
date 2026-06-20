const faqs = [
  {
    q: "What does MergeTrack analyze?",
    a: "React maintainability smells in JSX and TSX, scoped to the lines a Pull Request changes. Six checks today, each configurable per repository.",
  },
  {
    q: "Does my source code leave my environment?",
    a: "In MVP mode, no source is uploaded to third-party services. Analysis runs against the PR diff.",
  },
  {
    q: "How do I run it?",
    a: "Add it as a step in CI, or install the GitHub App so findings appear in the review automatically.",
  },
  {
    q: "Can I change the thresholds?",
    a: "Yes. Repository owners can tune each check, mute the ones they do not want, and set how severity maps to findings.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Free covers 3 repositories and 30 analyses per month, with all six checks included.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="lp-section">
      <div className="lp-container">
        <h2 className="lp-h2" style={{ maxWidth: "16ch" }}>Questions, answered.</h2>

        <dl className="lp-faq" style={{ marginTop: "clamp(2rem, 4vw, 3.5rem)" }}>
          {faqs.map((f) => (
            <div key={f.q} className="lp-faq-item">
              <dt className="lp-h3" style={{ fontSize: "1.15rem" }}>{f.q}</dt>
              <dd className="lp-body" style={{ margin: "0.6rem 0 0" }}>{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
