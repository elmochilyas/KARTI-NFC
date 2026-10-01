import type { MetadataRoute } from "next";
import { getCachedPublishedFlags } from "@/features/catalog/cache";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";
import { indexableRoutes, localePath } from "@/features/vitrine/site";
import { VITRINE_LOCALES } from "@/features/vitrine/i18n/dict";

/**
 * XML sitemap: canonical indexable marketing pages only. Order/success,
 * dashboard, /t/*, APIs, and profile pages are excluded by construction
 * (they never enter the site registry). Unpublished catalog products are
 * excluded so hidden products never create indexed content; on catalog
 * errors the full set is kept (fail-safe: never hide a published product).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  let flags: Record<string, boolean> | null = null;
  try {
    flags = await getCachedPublishedFlags();
  } catch {
    flags = null;
  }
  const entries: MetadataRoute.Sitemap = [];
  for (const route of indexableRoutes()) {
    if (flags && route.key.startsWith("product:")) {
      const slug = route.segments[1] ?? "";
      const product = productTypeFromSlug(slug);
      if (product && flags[product] === false) continue;
    }
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
