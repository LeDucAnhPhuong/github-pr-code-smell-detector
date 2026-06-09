import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, Github, AlertCircle } from "lucide-react";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (session?.user) {
    redirect("/");
  }

  const error = params.error;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--color-app-bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-lg border p-8 shadow-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Product mark */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              GitHub PR Code Smell Detector
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Developer Tools
            </div>
          </div>
        </div>

        {/* Value statement */}
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Sign in to your account
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Detect maintainability issues in Pull Request changes before merge.
        </p>

        {/* Error alert */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-md p-3 mb-4 text-sm"
            style={{
              backgroundColor: "var(--color-severity-high-bg)",
              color: "var(--color-severity-high-text)",
              border: "1px solid #f1aeb5",
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {error === "OAuthCallbackError" || error === "Callback"
                ? "GitHub authorization failed. Please try again."
                : error === "AccessDenied"
                ? "Repository access permission is required to show connected repositories."
                : "An error occurred during sign in. Please try again."}
            </span>
          </div>
        )}

        {/* GitHub OAuth button */}
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
        </form>

        {/* Secondary text */}
        <p className="text-xs mt-4 text-center" style={{ color: "var(--color-text-muted)" }}>
          Uses GitHub OAuth. Repository access is limited to authorized repositories.
        </p>

        {/* Security note */}
        <div
          className="flex items-center gap-2 mt-4 p-2.5 rounded-md text-xs"
          style={{
            backgroundColor: "var(--color-surface-muted)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
          <span>No source code is uploaded to third-party services in MVP mode.</span>
        </div>
      </div>
    </div>
  );
}
