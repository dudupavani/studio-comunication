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
    // A biblioteca 'canvas' é uma dependência opcional do Konva para ambientes Node.js.
    // Como não a usamos no lado do servidor para renderização, podemos ignorá-la com segurança.
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;
