import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/security",
        has: [
          {
            type: "host",
            value: "getzoikovertex.com",
          },
        ],
        destination: "https://zoikovertex.com/security",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
