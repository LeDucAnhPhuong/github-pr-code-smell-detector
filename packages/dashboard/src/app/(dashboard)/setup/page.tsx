import { auth } from "@/lib/auth";
import { getInstallationsByUser } from "@/lib/db/installations";
import { appSlug } from "@/lib/github-app";
import { SetupStepper } from "@/components/setup/SetupStepper";
import { Troubleshooting } from "@/components/setup/Troubleshooting";
import { InstallAppButton } from "@/components/setup/InstallAppButton";
import Link from "next/link";
import { GitPullRequest, Settings, Trash2, Gauge } from "lucide-react";
import { getTranslations } from "next-intl/server";

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card card-body">
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <Icon className="w-4 h-4" style={{ color: "var(--ink-3)" }} />
        <h3 className="h2">{title}</h3>
      </div>
      <div className="secondary" style={{ fontSize: 13 }}>
        {children}
      </div>
    </div>
  );
}

export default async function SetupPage() {
  const session = await auth();
  const userId = session!.user.id;
  const installations = await getInstallationsByUser(userId);
  const connected = installations.length > 0;
  const slug = appSlug();
  const t = await getTranslations("setup");
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">{t("pageTitle")}</h1>
        <span className="status">
          <span className="dot" style={{ background: connected ? "var(--ok-dot)" : "var(--idle-dot)" }} />
          {connected ? t("connected") : t("notConnected")}
        </span>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding: 24, marginBottom: 18 }}>
        <SetupStepper slug={slug} connected={connected} />
      </div>

      {connected && (
        <div className="card card-body between" style={{ marginBottom: 18 }}>
          <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
            {t("appInstalled", { accounts: installations.map((i) => i.accountLogin).join(", ") })}
          </p>
          <div className="row" style={{ gap: 10 }}>
            <InstallAppButton slug={slug} label={t("addRepo")} />
            <Link href="/repositories" className="btn btn-secondary btn-sm">
              {t("goToRepositories")}
            </Link>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 18 }}>
        <Card title={t("cardWhenTitle")} icon={GitPullRequest}>
          {t.rich("cardWhenBody", { strong })}
        </Card>
        <Card title={t("cardCustomizeTitle")} icon={Settings}>
          {t("cardCustomizeBody")}
        </Card>
        <Card title={t("cardManageTitle")} icon={Trash2}>
          {t("cardManageBody")}
        </Card>
        <Card title={t("cardQuotaTitle")} icon={Gauge}>
          {t("cardQuotaBody")}
        </Card>
      </div>

      <p className="eyebrow" style={{ marginBottom: 12 }}>
        {t("troubleshootingTitle")}
      </p>
      <Troubleshooting />
    </div>
  );
}
