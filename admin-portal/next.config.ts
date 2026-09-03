import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_COOKIE_NAME:
      process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME ||
      "rice-ai-admin-auth",
  },
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
