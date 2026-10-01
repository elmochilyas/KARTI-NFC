import { notFound } from "next/navigation";
import {
  getProductRoute,
  productRouteJsonLd,
  productRouteMetadata,
} from "@/features/catalog/route";
import { ProductPage } from "@/features/vitrine/ProductPage";
import { getDict } from "@/features/vitrine/i18n";
import { PRODUCT_PUBLIC_SLUGS } from "@/features/vitrine/products";
import { JsonLd } from "@/features/vitrine/seo";
import { getCachedPublishedFlags } from "@/features/catalog/cache";

export function generateStaticParams(): { productSlug: string }[] {
  return PRODUCT_PUBLIC_SLUGS.map((productSlug) => ({ productSlug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<import("next").Metadata> {
  return params.then(({ productSlug }) => productRouteMetadata(productSlug, "fr", getDict("fr")));
}

export default async function FrProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const route = await getProductRoute(productSlug, "fr");
  if (!route) notFound();
  const dict = getDict("fr");
  const jsonLd = productRouteJsonLd(route, dict, productSlug, "fr");
  const flags = await getCachedPublishedFlags();
  return (
    <>
      <JsonLd id="karti-jsonld-product" data={jsonLd.product} />
      <JsonLd id="karti-jsonld-breadcrumb" data={jsonLd.breadcrumb} />
      <JsonLd id="karti-jsonld-faq" data={jsonLd.faq} />
      <ProductPage
        locale="fr"
        dict={dict}
        slug={productSlug}
        catalog={route.catalog}
        publishedFlags={flags}
      />
    </>
  );
}
