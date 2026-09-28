import type { Metadata } from "next";
import { getDict } from "@/features/vitrine/i18n";
import { OrderWizard } from "@/features/vitrine/order/OrderWizard";
import { productTypeFromSlug } from "@/features/vitrine/products";
import { getAppUrl } from "@/lib/env";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return {
    title: `${dict.order.title} — Karti`,
    description: dict.order.subtitle,
    alternates: { canonical: `${getAppUrl()}/en/order` },
    robots: { index: false, follow: true },
  };
}

export default async function EnOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  return (
    <OrderWizard locale="en" dict={getDict("en")} initialProduct={productTypeFromSlug(product)} />
  );
}
