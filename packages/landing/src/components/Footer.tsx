import Image from "next/image";
import { dashboardUrl, loginUrl, navLinks } from "@/lib/site";

export function Footer() {
  return (
    <footer style={{ borderTop: "var(--rule-thick) solid var(--ink)" }}>
      <div className="lp-container lp-footer-grid lp-section" style={{ paddingBlock: "clamp(3rem, 6vw, 5rem)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Image src="/logo.png" alt="" width={24} height={24} />
            <span style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>MergeTrack</span>
          </div>
          <p className="lp-body" style={{ marginTop: "1rem", fontSize: "0.9rem", maxWidth: "32ch" }}>
            Track. Review. Merge. Catch maintainability issues in Pull Request changes before they land.
          </p>
        </div>

        <nav aria-label="Product">
          <p className="lp-eyebrow">Product</p>
          <ul style={{ listStyle: "none", margin: "1rem 0 0", padding: 0, display: "grid", gap: "0.6rem", fontSize: "0.9rem" }}>
            {navLinks.map((l) => (
              <li key={l.href}><a href={l.href} className="lp-textlink lp-muted">{l.label}</a></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account">
          <p className="lp-eyebrow">Account</p>
          <ul style={{ listStyle: "none", margin: "1rem 0 0", padding: 0, display: "grid", gap: "0.6rem", fontSize: "0.9rem" }}>
            <li><a href={loginUrl} className="lp-textlink lp-muted">Sign in</a></li>
            <li><a href={`${dashboardUrl}/login`} className="lp-textlink lp-muted">Get started</a></li>
          </ul>
        </nav>
      </div>

      <div className="lp-container" style={{ paddingBottom: "2rem" }}>
        <hr className="lp-hair" />
        <p className="lp-mono lp-muted" style={{ fontSize: "0.74rem", marginTop: "1.25rem" }}>
          © {new Date().getFullYear()} MergeTrack
        </p>
      </div>
    </footer>
  );
}
