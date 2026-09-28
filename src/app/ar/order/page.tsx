import type { Metadata } from "next";
import { getDict } from "@/features/vitrine/i18n";
import { OrderWizard } from "@/features/vitrine/order/OrderWizard";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return {
    title: `${dict.order.title} — Karti`,
    description: dict.order.subtitle,
    alternates: { canonical: `${getAppUrl()}/ar/order` },
    robots: { index: false, follow: true },
  };
}

export default async function ArOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  return (
    <OrderWizard locale="ar" dict={getDict("ar")} initialProduct={productTypeFromSlug(product)} />
  );
}
