import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Gzip/Brotli responses. Default is true in Next.js, but we're explicit
  // so a future config change doesn't silently regress this.
  compress: true,
  // Strip the "X-Powered-By: Next.js" fingerprint header.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vibechckd-cdn.b-cdn.net",
      },
    ],
  },
  // Tree-shake only the icon/animation symbols actually imported. We don't
  // ship lucide-react or @tabler/icons-react today, so framer-motion is the
  // only entry that matters — keep the list tight so we don't pay for
  // optimizations on packages that aren't installed.
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    // Baseline security headers applied to every route.
    // TODO: add a strict Content-Security-Policy once sources are audited
    // (inline scripts/styles, third-party domains, etc.). Rolling out a
    // broken CSP can take the whole app down, so leaving this out for now.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
