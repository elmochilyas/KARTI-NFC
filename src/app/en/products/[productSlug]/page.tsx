import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/features/vitrine/ProductPage";
import { getDict } from "@/features/vitrine/i18n";
import { PRODUCT_PUBLIC_SLUGS, productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  JsonLd,
  pageMetadata,
  productJsonLd,
} from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";

export function generateStaticParams(): { productSlug: string }[] {
  return PRODUCT_PUBLIC_SLUGS.map((productSlug) => ({ productSlug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  return buildMetadata(params, "en");
}

async function buildMetadata(
  params: Promise<{ productSlug: string }>,
  locale: "en",
): Promise<Metadata> {
  const { productSlug } = await params;
  const product = productTypeFromSlug(productSlug);
  if (!product) return { title: "Karti", robots: { index: false, follow: false } };
  const dict = getDict(locale);
  const copy = dict.products[product];
  return pageMetadata({
    locale,
    title: `${copy.name} — Karti`,
    description: copy.outcome,
    segments: ["products", productSlug],
  });
}

export default async function EnProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const product = productTypeFromSlug(productSlug);
  if (!product) notFound();
  const dict = getDict("en");
  const copy = dict.products[product];
  const appUrl = getAppUrl();
  const url = `${appUrl}${localePath("en", "products", productSlug)}`;
  return (
    <>
      <JsonLd
        id="karti-jsonld-product"
        data={productJsonLd({ name: copy.name, description: copy.outcome, url })}
      />
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/en` },
          { label: dict.common.products, url: `${appUrl}/en#products` },
          { label: copy.name, url },
        ])}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(copy.faq)} />
      <ProductPage locale="en" dict={dict} slug={productSlug} />
    </>
  );
}
