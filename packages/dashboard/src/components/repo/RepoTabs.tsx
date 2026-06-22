import Link from "next/link";
import { getTranslations } from "next-intl/server";

export type RepoTab = "overview" | "pulls" | "reports" | "config";

const TABS: { key: RepoTab; label: keyof Messages; href: (id: string) => string }[] = [
  { key: "overview", label: "tabOverview", href: (id) => `/repositories/${id}/overview` },
  { key: "pulls", label: "tabPulls", href: (id) => `/repositories/${id}/pulls` },
  { key: "reports", label: "tabReports", href: (id) => `/repositories/${id}/reports` },
  { key: "config", label: "tabConfig", href: (id) => `/repositories/${id}/config` },
];

// Local helper type for the keys we read from the repoDetail namespace.
type Messages = { tabOverview: string; tabPulls: string; tabReports: string; tabConfig: string };

/** Shared tab strip for the repository detail area. */
export async function RepoTabs({ repoId, active }: { repoId: string; active: RepoTab }) {
  const t = await getTranslations("repoDetail");
  return (
    <div
      className="row"
      style={{ gap: 2, padding: "8px 12px 0", borderBottom: "1px solid var(--border)" }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href(repoId)}
            style={{
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: -1,
              borderBottom: `2px solid ${isActive ? "var(--ink)" : "transparent"}`,
              color: isActive ? "var(--ink)" : "var(--ink-2)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </div>
  );
}
