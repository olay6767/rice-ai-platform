import { loadEnvConfig } from "@next/env";
import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.join(__dirname, "..");

// Admin เป็น Next.js อีกแอปหนึ่ง จึงต้องโหลด .env.local จาก workspace หลักเอง
// เพื่อใช้ Supabase โปรเจกต์เดียวกับเว็บไซต์ โดยไม่ต้องทำสำเนา secret
loadEnvConfig(
  workspaceRoot,
  process.env.NODE_ENV === "development",
  console,
  true
);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_COOKIE_NAME:
      process.env.ADMIN_SUPABASE_COOKIE_NAME?.trim() ||
      "rice-ai-admin-auth",
  },
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
