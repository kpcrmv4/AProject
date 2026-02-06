import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle optimization: auto tree-shake barrel file imports
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  // Image optimization for Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
