// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    // Define explicit root to evitar detecção incorreta de workspaces.
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      {
        protocol: "https",
        hostname: "nbifyakufmpxygisjhgj.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
