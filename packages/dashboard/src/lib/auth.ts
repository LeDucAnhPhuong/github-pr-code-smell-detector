// Re-export the shared Auth.js instance from @github-pr-code-smell-detector/core.
// Kept as a shim so existing `@/lib/auth` imports keep working.
export { handlers, signIn, signOut, auth } from "@github-pr-code-smell-detector/core";
