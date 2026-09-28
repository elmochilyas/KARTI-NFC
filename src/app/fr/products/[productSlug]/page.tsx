import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/features/vitrine/ProductPage";
import { getDict } from "@/features/vitrine/i18n";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";

export function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  return buildMetadata(params, "fr");
}

async function buildMetadata(
  params: Promise<{ productSlug: string }>,
  locale: "fr",
): Promise<Metadata> {
  const { productSlug } = await params;
  const product = productTypeFromSlug(productSlug);
  if (!product) return { title: "Karti", robots: { index: false, follow: false } };
  const dict = getDict(locale);
  const copy = dict.products[product];
  return {
    title: `${copy.name} — Karti`,
    description: copy.outcome,
    alternates: { canonical: `${getAppUrl()}/${locale}/products/${productSlug}` },
  };
}

export default async function FrProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  if (!productTypeFromSlug(productSlug)) notFound();
  return <ProductPage locale="fr" dict={getDict("fr")} slug={productSlug} />;
}
