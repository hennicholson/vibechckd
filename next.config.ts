import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vibechckd-cdn.b-cdn.net",
      },
    ],
  },
};

export default nextConfig;
