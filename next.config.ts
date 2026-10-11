import type { NextConfig } from "next";

// Production-only HSTS: never force it onto localhost development. Vercel
// sets VERCEL_ENV=production on production deployments only.
const isProductionDeploy = process.env.VERCEL_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No framing use-case (admin + public pages); blocks clickjacking.
  // A frame-ancestors CSP arrives with the full nonce-CSP work (Phase 14).
  { key: "X-Frame-Options", value: "DENY" },
  // Least capability: nothing in Karti uses camera/mic/location/payment/USB.
  // Deliberately absent: clipboard, share, NFC — restricting those could
  // break Copy URL, Web Share, or Web NFC writing.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isProductionDeploy
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev-only: Next.js 16 blocks cross-origin requests to internal dev
  // resources (/_next/*, /_next/hmr) by default. Loading the LAN URL from
  // a real phone therefore renders the HTML but never hydrates (the page
  // looks fine, yet any onClick control — e.g. the mobile hamburger — is
  // dead). Allow the private LAN ranges so `next dev` on the same Wi-Fi
  // hydrates normally.
  //
  // `*.trycloudflare.com` covers Cloudflare Quick Tunnel (`next dev` exposed
  // to a remote tester): the tunnel origin only receives the HTML otherwise,
  // and its /_next/* requests are blocked -> same "no hydration / dead
  // hamburger" symptom. `*` matches exactly one hostname label, which is the
  // Quick Tunnel shape (e.g. armstrong-cove-presently-consent.trycloudflare.com),
  // and it does NOT match the bare `trycloudflare.com`. This option has no
  // effect on production builds (dev server only), so production origin
  // protection is unchanged.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.trycloudflare.com"],
  experimental: {
    // Public pays react-icons only, dashboard pays lucide-react only — but
    // without this both libraries compile whole-package without tree-shaking
    // precision. Zero behavior change, smaller JS on every route.
    optimizePackageImports: ["react-icons", "lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
