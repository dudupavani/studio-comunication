// next.config.ts
import type { NextConfig } from "next";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // força sempre o bundle de browser
      konva: "konva/lib/index.js",
      // ⚙️ corrige resolução que o react-konva faz para submódulos do konva
      "konva/lib/Core.js": require.resolve("konva/lib/Core.js"),
      "konva/lib/Global.js": require.resolve("konva/lib/Global.js"),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        canvas: false, // evita tentar node-canvas no client
      };
    }
    return config;
  },
};

export default nextConfig;
