import type { Metadata } from "next";
import { PricingPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getHomeCatalogData } from "@/features/catalog/route";
import { allProducts, productSlugFromType } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath, orderPath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return staticMetadata("fr", dict.meta.pricing, ["pricing"]);
}

export default async function FrPricingPage() {
  const dict = getDict("fr");
  const appUrl = getAppUrl();
  const { flags, priceLines } = await getHomeCatalogData("fr");
  const products = allProducts()
    .filter((product) => flags[product] !== false)
    .map((product) => {
      const slug = productSlugFromType(product);
      return {
        product,
        name: dict.products[product].name,
        tagline: dict.products[product].tagline,
        href: `${localePath("fr", "products", slug)}`,
        orderHref: orderPath("fr", slug),
        priceLine: priceLines[product] ?? null,
      };
    });
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/fr` },
          { label: dict.nav.pricing, url: `${appUrl}${localePath("fr", "pricing")}` },
        ])}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(dict.pricingPage.faq)} />
      <PricingPage locale="fr" dict={dict} products={products} />
    </>
  );
}
