import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getGithubPermissions } from "@/lib/github-permissions";
import { getTranslations } from "next-intl/server";

export default async function AccountPage() {
  const session = await auth();
  const userId = session!.user.id;
  const t = await getTranslations("account");

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { scope: true, expires_at: true },
  });

  const isTokenExpired = account?.expires_at && account.expires_at * 1000 < Date.now();

  const permissions = getGithubPermissions(account?.scope);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="h1" style={{ marginBottom: 20 }}>{t("title")}</h1>

      {isTokenExpired && (
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 mb-6"
          style={{ backgroundColor: "var(--color-severity-high-bg)", borderColor: "var(--color-severity-high-text)", borderRadius: "var(--radius-card)" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-danger)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {t("tokenExpiredTitle")}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {t("tokenExpiredDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Profile card */}
      <div
        className="rounded-lg border p-5 mb-4"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center gap-4 mb-4">
          {session!.user.image && (
            <Image
              src={session!.user.image}
              alt="avatar"
              width={56}
              height={56}
              className="rounded-full"
            />
          )}
          <div>
            <div className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {session!.user.name}
            </div>
            <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {session!.user.email}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: "#e6f4ea", color: "#1a7f37", borderRadius: "var(--radius-badge)" }}
              >
                {t("githubConnected")}
              </span>
              {session!.user.role === "ADMIN" && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "var(--color-severity-medium-bg)", color: "var(--color-warning)", borderRadius: "var(--radius-badge)" }}
                >
                  {t("admin")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions card */}
      <div
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-card)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>{t("githubPermissions")}</h2>
        <div className="space-y-3">
          {permissions.map(({ label, present }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
              {present ? (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-success)" }}>
                  <CheckCircle className="w-4 h-4" />
                  {t("granted")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-danger)" }}>
                  <XCircle className="w-4 h-4" />
                  {t("notGranted")}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <form action="/api/auth/signin/github" method="POST">
            <input type="hidden" name="callbackUrl" value="/account" />
            <button type="submit" className="btn btn-secondary btn-sm">
              {t("refreshPermissions")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
