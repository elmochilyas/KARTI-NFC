import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

/**
 * Marketing pages are crawlable; operational surfaces are not.
 * Order/success rely on meta noindex too (defense in depth).
 */
export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/fr", "/ar", "/en"],
        disallow: ["/dashboard", "/login", "/t/", "/api/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
