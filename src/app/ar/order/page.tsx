import type { Metadata } from "next";
import { getHomeCatalogData } from "@/features/catalog/route";
import { getDict } from "@/features/vitrine/i18n";
import { OrderPageView } from "@/features/vitrine/order/OrderPageView";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return pageMetadata({
    locale: "ar",
    title: `${dict.order.title} — Karti`,
    description: dict.order.subtitle,
    segments: ["order"],
    index: false,
    follow: true,
  });
}

export default async function ArOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const dict = getDict("ar");
  const { flags, priceLines } = await getHomeCatalogData("ar");
  return (
    <OrderPageView
      locale="ar"
      dict={dict}
      initialProduct={productTypeFromSlug(product)}
      publishedFlags={flags}
      priceLines={priceLines}
    />
  );
}
