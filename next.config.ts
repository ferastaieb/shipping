import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: ['147.93.58.160'], // add any additional allowed domains here
  },
  env: {
    NEXT_PUBLIC_API_URL: "https://main.d2caobpb2tliwi.amplifyapp.com",
  },
};

export default nextConfig;
