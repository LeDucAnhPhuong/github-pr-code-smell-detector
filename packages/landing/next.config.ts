import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for a slim Docker image.
  output: "standalone",
  // npm-workspaces monorepo: trace files from the repo root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
