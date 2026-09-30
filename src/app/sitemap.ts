import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";
import { indexableRoutes, localePath } from "@/features/vitrine/site";
import { VITRINE_LOCALES } from "@/features/vitrine/i18n/dict";

/**
 * XML sitemap: canonical indexable marketing pages only. Order/success,
 * dashboard, /t/*, APIs, and profile pages are excluded by construction
 * (they never enter the site registry).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const entries: MetadataRoute.Sitemap = [];
  for (const route of indexableRoutes()) {
    for (const locale of VITRINE_LOCALES) {
      entries.push({
        url: `${appUrl}${localePath(locale, ...route.segments)}`,
        changeFrequency: route.key === "home" ? "weekly" : "monthly",
        priority: route.key === "home" ? 1 : route.key.startsWith("product:") ? 0.9 : 0.7,
      });
    }
  }
  return entries;
}
