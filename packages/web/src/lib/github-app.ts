import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

// Server-side only — uses the GitHub App private key. Never import in client components.

function privateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
  // Support keys stored with literal "\n" in a single-line env var.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function appId(): string {
  const id = process.env.GITHUB_APP_ID;
  if (!id) throw new Error("GITHUB_APP_ID is not set");
  return id;
}

/** Mint a short-lived (~1h) installation access token for a given installation. */
export async function getInstallationToken(installationId: number): Promise<string> {
  const auth = createAppAuth({ appId: appId(), privateKey: privateKey() });
  const { token } = await auth({ type: "installation", installationId });
  return token;
}

/** An Octokit authenticated as the installation (for listing repos, etc.). */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token });
}

/** The GitHub App slug used to build the install URL. */
export function appSlug(): string {
  return process.env.GITHUB_APP_SLUG ?? "";
}
