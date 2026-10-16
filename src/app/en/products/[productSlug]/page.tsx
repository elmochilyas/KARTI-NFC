import { notFound } from "next/navigation";
import {
  getProductRoute,
  getRelatedCards,
  productRouteJsonLd,
  productRouteMetadata,
} from "@/features/catalog/route";
import { ProductLandingPage } from "@/features/vitrine/product/landing";
import { getDict } from "@/features/vitrine/i18n";
import { PRODUCT_PUBLIC_SLUGS } from "@/features/vitrine/products";
import { JsonLd } from "@/features/vitrine/seo";

export function generateStaticParams(): { productSlug: string }[] {
  return PRODUCT_PUBLIC_SLUGS.map((productSlug) => ({ productSlug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<import("next").Metadata> {
  return params.then(({ productSlug }) => productRouteMetadata(productSlug, "en", getDict("en")));
}

export default async function EnProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const route = await getProductRoute(productSlug, "en");
  if (!route) notFound();
  const dict = getDict("en");
  const jsonLd = productRouteJsonLd(route, dict, productSlug, "en");
  const relatedCards = await getRelatedCards(route.product, "en");
  return (
    <>
      {jsonLd.product ? <JsonLd id="karti-jsonld-product" data={jsonLd.product} /> : null}
      <JsonLd id="karti-jsonld-breadcrumb" data={jsonLd.breadcrumb} />
      <JsonLd id="karti-jsonld-faq" data={jsonLd.faq} />
      <ProductLandingPage
        locale="en"
        dict={dict}
        slug={productSlug}
        catalog={route.catalog}
        relatedCards={relatedCards}
      />
    </>
  );
}
