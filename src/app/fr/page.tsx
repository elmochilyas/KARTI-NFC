import type { Metadata } from "next";
import { getHomeCatalogData } from "@/features/catalog/route";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { JsonLd, organizationJsonLd, pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return pageMetadata({
    locale: "fr",
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    segments: [],
  });
}

/**
 * ISR for the marketing home (PageSpeed: cuts `/fr` TTFB out of the LCP
 * critical chain). Catalog data itself is cached indefinitely and purged
 * synchronously on dashboard edits (`revalidateCatalog`); dashboard
 * catalog actions also `revalidatePath` the locale homes, so price/copy
 * changes stay promptly visible despite the hourly static window.
 */
export const revalidate = 3600;

export default async function FrHomePage() {
  const dict = getDict("fr");
  const { flags, priceLines } = await getHomeCatalogData("fr");
  return (
    <>
      <JsonLd
        id="karti-jsonld-organization"
        data={organizationJsonLd(getAppUrl(), "Karti", dict.meta.home.description)}
      />
      <HomePage locale="fr" dict={dict} publishedFlags={flags} priceLines={priceLines} />
    </>
  );
}
