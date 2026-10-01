import type { Metadata } from "next";
import { getHomeCatalogData } from "@/features/catalog/route";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { JsonLd, organizationJsonLd, pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return pageMetadata({
    locale: "en",
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    segments: [],
  });
}

export default async function EnHomePage() {
  const dict = getDict("en");
  const { flags, priceLines } = await getHomeCatalogData("en");
  return (
    <>
      <JsonLd
        id="karti-jsonld-organization"
        data={organizationJsonLd(getAppUrl(), "Karti", dict.meta.home.description)}
      />
      <HomePage locale="en" dict={dict} publishedFlags={flags} priceLines={priceLines} />
    </>
  );
}
