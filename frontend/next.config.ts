import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "*.pinimg.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
      },
      {
        protocol: "https",
        hostname: "*.threads.net",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 5,
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control",       value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma",              value: "no-cache" },
          { key: "Expires",             value: "0" },
          { key: "CDN-Cache-Control",   value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/queue',
        destination: '/review-queue',
        permanent: true,
      },
      {
        source: '/security',
        destination: 'https://www.zoikovertex.com/security',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:5006'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
