// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "nbifyakufmpxygisjhgj.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // ✅ força uso do bundle de browser do Konva só quando o import é exatamente "konva"
      konva$: "konva/lib/index.js",
    };

    // Defensivo: no client, não tentar resolver o módulo nativo 'canvas'
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        canvas: false,
      };
    }

    return config;
  },
};

export default nextConfig;
