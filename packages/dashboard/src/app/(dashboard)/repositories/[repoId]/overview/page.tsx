import { auth } from "@/lib/auth";
import { getRepository, getProjectOverview } from "@/lib/db/repositories";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RepoTabs } from "@/components/repo/RepoTabs";
import { getTranslations } from "next-intl/server";

// Shape we expect inside ProjectOverview.metadata. Everything optional — we only
// render what the model actually returned (data-contract grounding).
interface OverviewMetadata {
  stack?: string[];
  architecture?: string[];
  modules?: { name?: string; description?: string }[];
  conventions?: string[];
  domain?: string[];
  dependencies?: string[];
}

const STATUS_DOT: Record<string, string> = {
  READY: "var(--ok-dot)",
  INDEXING: "var(--run-dot)",
  FAILED: "var(--fail-dot)",
  PENDING: "var(--idle-dot)",
};

function Chips({ items }: { items: string[] }) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {items.map((c, i) => (
        <span key={`${c}-${i}`} className="badge badge-neutral">
          {c}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default async function RepoOverviewPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const overview = await getProjectOverview(repoId, session!.user.id);
  const t = await getTranslations("overviewTab");
  const tStatus = await getTranslations("status");

  const status = overview?.status ?? "PENDING";
  const metadata = (overview?.metadata as OverviewMetadata | null) ?? null;
  const modules = (metadata?.modules ?? []).filter((m) => m?.name);
  const hasSummary = Boolean(overview?.summaryMd);

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumb") },
        ]}
      />

      <h1 className="h1" style={{ marginBottom: 14 }}>
        {repo.fullName}
      </h1>

      <div className="card" style={{ overflow: "hidden" }}>
        <RepoTabs repoId={repoId} active="overview" />

        <div className="card-body">
          {/* Index status line */}
          <div className="between" style={{ alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <span className="status">
              <span className="dot" style={{ background: STATUS_DOT[status] ?? "var(--idle-dot)" }} />
              {tStatus(status)}
            </span>
            {/* Re-indexing badge: old overview still shown while a new build runs */}
            {status === "INDEXING" && hasSummary && (
              <span className="badge badge-neutral">{t("updating")}</span>
            )}
            {overview?.indexedSha && (
              <span className="muted" style={{ fontSize: 12 }}>
                {t("indexedAt", {
                  sha: overview.indexedSha.slice(0, 7),
                  files: overview.filesScanned,
                  cost: `$${Number(overview.costUsd).toFixed(4)}`,
                })}
              </span>
            )}
          </div>

          {/* Empty / pending / failed states */}
          {!overview || (status === "PENDING" && !hasSummary) ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
              {t("pending")}
            </div>
          ) : status === "INDEXING" && !hasSummary ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
              {t("indexing")}
            </div>
          ) : status === "FAILED" && !hasSummary ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fail-dot)" }}>
              {t("failed")}
              {overview.errorMessage ? `: ${overview.errorMessage}` : ""}
            </div>
          ) : (
            <>
              {/* Metadata chips — only render fields the model actually returned */}
              {metadata?.stack?.length ? (
                <Section title={t("stack")}>
                  <Chips items={metadata.stack} />
                </Section>
              ) : null}

              {modules.length ? (
                <Section title={t("modules")}>
                  <Chips items={modules.map((m) => m.name!)} />
                </Section>
              ) : null}

              {metadata?.conventions?.length ? (
                <Section title={t("conventions")}>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-2)" }}>
                    {metadata.conventions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {metadata?.domain?.length ? (
                <Section title={t("domain")}>
                  <Chips items={metadata.domain} />
                </Section>
              ) : null}

              {metadata?.dependencies?.length ? (
                <Section title={t("dependencies")}>
                  <Chips items={metadata.dependencies} />
                </Section>
              ) : null}

              {/* Full markdown summary */}
              {hasSummary && (
                <Section title={t("summary")}>
                  <pre
                    className="mono"
                    style={{
                      fontSize: 12,
                      padding: 14,
                      borderRadius: "var(--r)",
                      background: "var(--code-bg)",
                      color: "var(--ink)",
                      border: "1px solid var(--border)",
                      whiteSpace: "pre-wrap",
                      overflow: "auto",
                    }}
                  >
                    {overview!.summaryMd}
                  </pre>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
