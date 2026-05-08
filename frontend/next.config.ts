import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5005/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
