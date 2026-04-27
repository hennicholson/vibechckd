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
  // Allow ngrok / Whop to load the dev server without "cross-origin request"
  // warnings. Wildcard so any rotating ngrok subdomain is accepted.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.whop.com"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    // Whop wraps the entire app in their iframe (xxx.apps.whop.com), so once a
    // user signs in via /whop they navigate freely into /browse, /dashboard,
    // /coders/*, etc. — every route must be embeddable inside Whop. We use
    // `frame-ancestors` CSP everywhere (the modern directive that supersedes
    // X-Frame-Options) restricted to self + whop.com so other origins still
    // can't embed us. localhost entries cover dev access through the proxy.
    const frameAncestors =
      "frame-ancestors 'self' https://whop.com https://*.whop.com http://localhost:* http://127.0.0.1:*;";

    const baseHeaders = [
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
      { key: "Content-Security-Policy", value: frameAncestors },
    ];

    return [{ source: "/:path*", headers: baseHeaders }];
  },
};

export default nextConfig;
