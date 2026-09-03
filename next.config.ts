import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (supabaseUrl) {
  const url = new URL(supabaseUrl);

  remotePatterns.push({
    protocol: url.protocol === "http:" ? "http" : "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/storage/v1/object/public/admin-media/**",
    search: "",
  });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "*.trycloudflare.com",
  ],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
