import type { Metadata } from "next";
import { getDict } from "@/features/vitrine/i18n";
import { OrderPageView } from "@/features/vitrine/order/OrderPageView";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return pageMetadata({
    locale: "en",
    title: `${dict.order.title} — Karti`,
    description: dict.order.subtitle,
    segments: ["order"],
    index: false,
    follow: true,
  });
}

export default async function EnOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const dict = getDict("en");
  return (
    <OrderPageView locale="en" dict={dict} initialProduct={productTypeFromSlug(product)} />
  );
}
