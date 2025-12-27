import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: ['147.93.58.160'], // add any additional allowed domains here
  },
};

export default nextConfig;
