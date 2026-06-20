import type { NextConfig } from "next";
import path from "node:path";

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
};

export default nextConfig;
