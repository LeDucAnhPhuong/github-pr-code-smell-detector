// Where the landing's CTAs send people. Override per environment.
export const dashboardUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export const loginUrl = `${dashboardUrl}/login`;

export const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Checks" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;
