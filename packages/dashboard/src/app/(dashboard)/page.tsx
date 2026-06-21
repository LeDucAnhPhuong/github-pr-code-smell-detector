import { auth } from "@/lib/auth";
import { getDashboardStats, getRecentAnalyses } from "@/lib/db/analyses";
import { getHighSeverityFindings } from "@/lib/db/findings";
import { getRepositories } from "@/lib/db/repositories";
import { hasInstallation } from "@/lib/db/installations";
import { SeverityBadge } from "@/components/findings/SeverityBadge";
import { GitBranch, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

function MetricCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const card = (
    <div className="card card-body">
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.02em" }}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "var(--ok-dot)",
  RUNNING: "var(--run-dot)",
  FAILED: "var(--fail-dot)",
  PENDING: "var(--idle-dot)",
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className="status">
      <span className="dot" style={{ background: STATUS_DOT[status] ?? "var(--idle-dot)" }} />
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // New users without a GitHub App installation go through onboarding first.
  if (!(await hasInstallation(userId))) {
    redirect("/setup");
  }

  const [stats, recentAnalyses, highFindings, repos, t, tStatus] = await Promise.all([
    getDashboardStats(userId),
    getRecentAnalyses(userId, 5),
    getHighSeverityFindings(userId, 4),
    getRepositories(userId),
    getTranslations("dashboard"),
    getTranslations("status"),
  ]);

  const reposNeedingAttention = repos.filter((r) => r.pullRequests.length > 0);

  return (
    <div className="page-w stack">
      <h1 className="h1">{t("title")}</h1>

      {/* Metrics */}
      <div className="grid-4">
        <MetricCard label={t("connectedRepos")} value={stats.repoCount} href="/repositories" />
        <MetricCard label={t("openPRs")} value={stats.openPRCount} />
        <MetricCard label={t("findingsThisWeek")} value={stats.findingsThisWeek} />
        <MetricCard label={t("quotaUsed")} value={`${stats.quotaPercent}%`} href="/billing" />
      </div>

      {repos.length === 0 ? (
        <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>
          <GitBranch className="w-7 h-7" style={{ margin: "0 auto 12px", color: "var(--ink-3)" }} />
          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{t("noReposTitle")}</p>
          <p className="secondary" style={{ margin: "0 0 16px", fontSize: 12.5 }}>
            {t("noReposDesc")}
          </p>
          <Link href="/repositories" className="btn btn-primary" style={{ margin: "0 auto", width: "fit-content" }}>
            <Plus className="w-4 h-4" />
            {t("connectRepository")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-2-1">
            {/* Recent analyses */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-head">
                <h2 className="h2">{t("recentAnalyses")}</h2>
                <Link className="link" href="/repositories">
                  {t("viewAll")}
                </Link>
              </div>
              {recentAnalyses.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
                  {t("noAnalysesYet")}{" "}
                  <Link href="/repositories" className="link">
                    {t("connectARepository")}
                  </Link>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("thPR")}</th>
                      <th>{t("thRepository")}</th>
                      <th>{t("thStatus")}</th>
                      <th>{t("thFindings")}</th>
                      <th>{t("thHigh")}</th>
                      <th>{t("thLastRun")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAnalyses.map((a) => {
                      const highCount = a.findings?.filter((f) => f.severity === "error").length ?? 0;
                      const elapsed = Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60000);
                      return (
                        <tr key={a.id}>
                          <td>
                            <Link className="link" href={`/repositories/${a.pullRequest.repositoryId}/pulls/${a.pullRequestId}`}>
                              #{a.pullRequest.prNumber} {a.pullRequest.title.slice(0, 30)}
                              {a.pullRequest.title.length > 30 ? "…" : ""}
                            </Link>
                          </td>
                          <td className="secondary mono" style={{ fontSize: 12 }}>
                            {a.pullRequest.repository.fullName}
                          </td>
                          <td>
                            <StatusBadge status={a.status} label={tStatus(a.status)} />
                          </td>
                          <td className="secondary">{a.status === "COMPLETED" ? `${a.findings?.length ?? 0}` : "—"}</td>
                          <td>
                            {highCount > 0 ? (
                              <span style={{ color: "var(--sev-high-ink)", fontWeight: 500 }}>{highCount}</span>
                            ) : (
                              <span className="muted">0</span>
                            )}
                          </td>
                          <td className="muted">
                            {elapsed < 1
                              ? t("timeNow")
                              : elapsed < 60
                              ? t("minutesAgo", { m: elapsed })
                              : t("hoursAgo", { h: Math.round(elapsed / 60) })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card card-body">
                <h2 className="h2" style={{ marginBottom: 10 }}>
                  {t("subscriptionUsage")}
                </h2>
                <div className="between" style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>
                  <span>{t("analysesThisMonth")}</span>
                  <span>
                    {stats.analysisUsed} / {stats.analysisQuota}
                  </span>
                </div>
                <div className="bar">
                  <i
                    style={{
                      width: `${Math.min(stats.quotaPercent, 100)}%`,
                      background: stats.quotaPercent > 80 ? "var(--sev-high-ink)" : "var(--accent)",
                    }}
                  />
                </div>
                {stats.quotaPercent > 80 && (
                  <p className="field-help" style={{ color: "var(--sev-high-ink)" }}>
                    {t("over80Quota")}{" "}
                    <Link href="/billing/plans" className="link">
                      {t("upgrade")}
                    </Link>
                  </p>
                )}
              </div>

              <div className="card" style={{ flex: 1, overflow: "hidden" }}>
                <div className="card-head">
                  <h2 className="h2">{t("highSeverityFindings")}</h2>
                </div>
                {highFindings.length === 0 ? (
                  <p style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
                    {t("noHighFindings")}
                  </p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {highFindings.map((f) => (
                      <li key={f.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                        <div className="row" style={{ gap: 8, marginBottom: 3 }}>
                          <SeverityBadge severity="error" />
                          <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                            {f.ruleName}
                          </span>
                        </div>
                        <div className="muted mono" style={{ fontSize: 11.5 }}>
                          {f.prAnalysis.pullRequest.repository.fullName}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Repositories needing attention */}
          {reposNeedingAttention.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-head">
                <h2 className="h2">{t("reposNeedingAttention")}</h2>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {reposNeedingAttention.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="between"
                    style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}
                  >
                    <Link href={`/repositories/${r.id}`} className="link cell-strong">
                      {r.fullName}
                    </Link>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {t("openPRCount", { count: r.pullRequests.length })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
