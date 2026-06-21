import { ArrowRight } from "lucide-react";
import { loginUrl } from "@/lib/site";
import { FindingsPreview } from "./FindingsPreview";

export function Hero() {
  return (
    <section id="main" className="lp-section" style={{ paddingTop: "clamp(3rem, 6vw, 6rem)" }}>
      <div className="lp-container lp-hero-grid">
        <div>
          <p className="lp-eyebrow" data-hero>Static analysis for Pull Requests</p>
          <h1 className="lp-hero-display" style={{ marginTop: "1.5rem" }} data-hero>
            Catch code smells before they <em style={{ fontStyle: "italic" }}>merge.</em>
          </h1>
          <p className="lp-lead" style={{ marginTop: "1.75rem" }} data-hero>
            MergeTrack runs static analysis on the changed lines of every Pull Request and ranks
            what it finds by severity.
          </p>

          {/* Decorative punctuation: thick rule + bordered square */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "2rem 0" }} aria-hidden="true" data-hero>
            <span style={{ width: 64, borderTop: "var(--rule-thick) solid var(--ink)" }} />
            <span className="lp-square" />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }} data-hero>
            <a href={loginUrl} className="lp-btn lp-btn-primary">
              Get started <ArrowRight size={16} strokeWidth={1.5} />
            </a>
            <a href="#how" className="lp-btn lp-btn-outline">
              See how it works
            </a>
          </div>
        </div>

        <div className="lp-hero-aside" data-hero>
          <FindingsPreview />
        </div>
      </div>
    </section>
  );
}
