import { GitPullRequest, ScanLine, ListChecks } from "lucide-react";

const steps = [
  {
    icon: GitPullRequest,
    title: "Open a Pull Request",
    body: "Work the way you already do. MergeTrack hooks into the GitHub PR flow, in CI or as a GitHub App.",
  },
  {
    icon: ScanLine,
    title: "It scans the diff",
    body: "Analysis runs on the lines the PR actually changed, not the whole repository, so the signal stays relevant.",
  },
  {
    icon: ListChecks,
    title: "Review ranked findings",
    body: "Maintainability issues come back grouped by severity, with a concrete suggestion attached to each one.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="lp-section lp-tex lp-tex-diag">
      <div className="lp-container">
        <h2 className="lp-h2" style={{ maxWidth: "16ch" }} data-reveal>
          From open to merge, in the same review you already run.
        </h2>

        <div className="lp-steps" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }} data-reveal-stagger>
          {steps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="lp-step">
              <Icon size={26} strokeWidth={1.5} />
              <h3 className="lp-h3" style={{ marginTop: "1.25rem" }}>{title}</h3>
              <p className="lp-body" style={{ marginTop: "0.75rem", fontSize: "0.95rem" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
