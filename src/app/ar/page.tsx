import type { Metadata } from "next";
import { getHomeCatalogData } from "@/features/catalog/route";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { JsonLd, organizationJsonLd, pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return pageMetadata({
    locale: "ar",
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    segments: [],
  });
}

/**
 * ISR for the marketing home (PageSpeed: cuts `/ar` TTFB out of the LCP
 * critical chain). See `/fr` for the freshness contract: dashboard
 * catalog actions revalidate the locale homes on every edit.
 */
export const revalidate = 3600;

export default async function ArHomePage() {
  const dict = getDict("ar");
  const { flags, priceLines, images } = await getHomeCatalogData("ar");
  return (
    <>
      <JsonLd
        id="karti-jsonld-organization"
        data={organizationJsonLd(getAppUrl(), "Karti", dict.meta.home.description)}
      />
      <HomePage
        locale="ar"
        dict={dict}
        publishedFlags={flags}
        priceLines={priceLines}
        productImages={images}
      />
    </>
  );
}
