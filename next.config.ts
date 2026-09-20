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
