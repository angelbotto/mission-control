import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // solo para Docker/NAS — quitar para desarrollo local
  env: {
    AGENTS_DIR: process.env.AGENTS_DIR || "/Users/angelbotto/.openclaw/agents",
    GATEWAY_URL: process.env.GATEWAY_URL || "http://localhost:18789",
    OPENCLAW_GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789",
    OPENCLAW_CONFIG: process.env.OPENCLAW_CONFIG || "/Users/angelbotto/.openclaw/openclaw.json",
    WORKSPACE_DIR: process.env.WORKSPACE_DIR || "/Users/angelbotto/.openclaw/workspace",
  },
  serverExternalPackages: ["@dagrejs/dagre"],
};

export default nextConfig;
