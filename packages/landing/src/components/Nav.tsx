import Image from "next/image";
import { dashboardUrl, loginUrl, navLinks } from "@/lib/site";

export function Nav() {
  return (
    <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 40, background: "var(--bg)" }}>
      <nav className="lp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: "1.5rem" }}>
        <a href="#main" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }} aria-label="MergeTrack home">
          <Image src="/logo.png" alt="" width={26} height={26} priority />
          <span style={{ fontWeight: 600, letterSpacing: "-0.02em", fontSize: "1.05rem" }}>MergeTrack</span>
        </a>

        <ul style={{ display: "flex", gap: "1.75rem", listStyle: "none", margin: 0, padding: 0, fontSize: "0.9rem" }} className="lp-nav-links">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="lp-textlink lp-muted" style={{ color: "var(--ink-2)" }}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <a href={loginUrl} className="lp-textlink lp-sign-in" style={{ fontSize: "0.9rem" }}>
            Sign in
          </a>
          <a href={`${dashboardUrl}/login`} className="lp-btn lp-btn-primary" style={{ padding: "0.7rem 1.1rem" }}>
            Get started
          </a>
        </div>
      </nav>
    </header>
  );
}
