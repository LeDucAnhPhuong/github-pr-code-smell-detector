import { Check } from "lucide-react";
import { loginUrl, plansUrl } from "@/lib/site";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  highlight?: boolean;
};

// Shape returned by the dashboard's GET /api/plans.
type ApiPlan = {
  id: string;
  name: string;
  price: number;
  repositoryLimit: number;
  analysisQuota: number;
  hasCheckAnnotations: boolean;
  hasHistoricalReports: boolean;
};

// Fallback used only if the dashboard is unreachable at build/request time, so
// the marketing page never ships an empty pricing table. Mirrors the seeded
// plans; the live API is the source of truth.
const fallbackTiers: Tier[] = [
  {
    name: "Free",
    price: "0₫",
    cadence: "forever",
    features: ["3 repositories", "30 analyses / month", "All 6 React checks"],
  },
  {
    name: "Pro",
    price: "199.000₫",
    cadence: "per month",
    highlight: true,
    features: ["25 repositories", "100 analyses / month", "Check annotations on PRs", "Historical reports"],
  },
  {
    name: "Team",
    price: "499.000₫",
    cadence: "per month",
    features: ["100 repositories", "1,000 analyses / month", "Everything in Pro"],
  },
];

function planToTier(p: ApiPlan): Tier {
  const isFree = p.price <= 0;
  const features = [
    `${p.repositoryLimit} repositories`,
    `${p.analysisQuota.toLocaleString("en-US")} analyses / month`,
  ];
  if (isFree) features.push("All 6 React checks");
  if (p.hasCheckAnnotations) features.push("Check annotations on PRs");
  if (p.hasHistoricalReports) features.push("Historical reports");
  return {
    name: p.name,
    price: isFree ? "0₫" : `${p.price.toLocaleString("vi-VN")}₫`,
    cadence: isFree ? "forever" : "per month",
    features,
  };
}

async function getTiers(): Promise<Tier[]> {
  try {
    // Revalidate hourly; plans rarely change. Server-to-server fetch, no CORS.
    const res = await fetch(plansUrl, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`plans ${res.status}`);
    const json = (await res.json()) as { data?: ApiPlan[] };
    const plans = json.data;
    if (!Array.isArray(plans) || plans.length === 0) throw new Error("no plans");

    const tiers = plans.map(planToTier);
    // Elevate the middle tier (the recommended one) to match the design.
    const featured = tiers.length >= 3 ? Math.floor((tiers.length - 1) / 2) : tiers.length - 1;
    if (tiers[featured]) tiers[featured].highlight = true;
    return tiers;
  } catch {
    return fallbackTiers;
  }
}

export async function Pricing() {
  const tiers = await getTiers();

  return (
    <section id="pricing" className="lp-section">
      <div className="lp-container">
        <div data-reveal>
          <p className="lp-eyebrow">Pricing</p>
          <h2 className="lp-h2" style={{ marginTop: "1.25rem", maxWidth: "18ch" }}>
            Start free. Grow when your team does.
          </h2>
        </div>

        <div className="lp-tiers" style={{ marginTop: "clamp(2.5rem, 5vw, 4rem)" }} data-reveal-stagger>
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`lp-card lp-tier${t.highlight ? " lp-invert lp-tier-featured" : ""}`}
            >
              <h3 className="lp-h3">{t.name}</h3>
              <p style={{ margin: "1.25rem 0 0", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span className="lp-display" style={{ fontSize: "clamp(2.5rem, 4vw, 3.25rem)", lineHeight: 1 }}>
                  {t.price}
                </span>
                <span className="lp-mono lp-muted" style={{ fontSize: "0.78rem" }}>{t.cadence}</span>
              </p>

              <ul style={{ listStyle: "none", margin: "1.75rem 0 0", padding: 0, display: "grid", gap: "0.75rem" }}>
                {t.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: "0.6rem", fontSize: "0.92rem", lineHeight: 1.4 }}>
                    <Check size={18} strokeWidth={1.5} style={{ flex: "none", marginTop: 1 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={loginUrl}
                className={`lp-btn ${t.highlight ? "lp-btn-primary" : "lp-btn-outline"}`}
                style={{ marginTop: "2rem", width: "100%", justifyContent: "center" }}
              >
                Get started
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
