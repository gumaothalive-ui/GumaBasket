import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // In an npm workspace, Next.js static generation workers need to find
  // Next.js internal pages from the root node_modules.
  outputFileTracingRoot: path.join(process.cwd(), "../"),
};

export default nextConfig;
