import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mobile optimizations
  experimental: {
    optimizePackageImports: ["tldraw", "@tldraw/tldraw"],
  },
  // PWA and mobile app support
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        // Mobile viewport optimizations
        {
          key: "viewport-fit",
          value: "cover",
        },
      ],
    },
  ],
};

export default nextConfig;
