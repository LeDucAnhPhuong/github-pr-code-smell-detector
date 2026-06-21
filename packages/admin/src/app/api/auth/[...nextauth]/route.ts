// Mount Auth.js route handlers so admin can sign in/out on its own (port 3002),
// independent of the dashboard. Uses the shared NextAuth config from core, which
// reads this app's own env (AUTH_GITHUB_ID/SECRET, NEXTAUTH_SECRET, AUTH_URL).
import { handlers } from "@github-pr-code-smell-detector/core";

export const { GET, POST } = handlers;
