import { ArrowRight } from "lucide-react";
import { loginUrl } from "@/lib/site";

export function Cta() {
  return (
    <section className="lp-invert lp-tex lp-tex-radial lp-section">
      <div className="lp-container" style={{ textAlign: "center" }}>
        <h2 className="lp-display" style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)", margin: "0 auto", maxWidth: "16ch" }}>
          Keep the smells out of main.
        </h2>
        <p className="lp-lead" style={{ margin: "1.75rem auto 0", color: "rgba(255,255,255,.72)" }}>
          Connect a repository and run your first analysis in minutes.
        </p>
        <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center" }}>
          <a href={loginUrl} className="lp-btn lp-btn-primary">
            Get started <ArrowRight size={16} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
