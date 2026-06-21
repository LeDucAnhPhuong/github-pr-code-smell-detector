import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: trace from repo root so the shared workspace package is bundled.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  transpilePackages: ["@github-pr-code-smell-detector/core"],
};

export default nextConfig;
