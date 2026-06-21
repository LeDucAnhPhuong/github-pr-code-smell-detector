export function ProductDetail() {
  return (
    <section className="lp-section lp-tex lp-tex-grid">
      <div className="lp-container lp-detail-grid">
        <div>
          <h2 className="lp-h2" style={{ maxWidth: "14ch" }} data-reveal>
            Review the change, not the whole codebase.
          </h2>
        </div>

        <div className="lp-prose" data-reveal-stagger>
          <p className="lp-dropcap">
            Most static analysis tools grade your entire repository and bury a Pull Request under
            thousands of pre-existing warnings. MergeTrack does the opposite. It looks at the diff,
            scores only what the PR introduces, and leaves the rest of your backlog alone.
          </p>
          <p>
            Every finding names the file and line, explains the smell in plain language, and offers a
            concrete way to address it. Severity decides what blocks and what is merely worth noting,
            so the review conversation stays about this change.
          </p>
          <p>
            Run it in CI for a fast gate on each push, or install the GitHub App to have results land
            directly in the review. Repository owners can tune thresholds, mute checks, and keep a
            history of reports on paid plans.
          </p>
        </div>
      </div>
    </section>
  );
}
