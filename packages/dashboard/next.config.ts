import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle (.next/standalone) for a slim Docker image.
  output: "standalone",
  // We live in an npm-workspaces monorepo; trace files from the repo root so the
  // workspace dependency (github-pr-code-smell-detector / analyzer) is bundled too.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  // Shared workspace package compiled from TS source.
  transpilePackages: ["@github-pr-code-smell-detector/core"],
};

export default withNextIntl(nextConfig);
