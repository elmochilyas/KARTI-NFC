import type { Metadata } from "next";
import { getDict } from "@/features/vitrine/i18n";
import { OrderSuccess } from "@/features/vitrine/order/OrderSuccess";

export function generateMetadata(): Metadata {
  return {
    title: `${getDict("fr").success.title} — Karti`,
    robots: { index: false, follow: false },
  };
}

export default async function FrOrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; t?: string }>;
}) {
  const { r, t } = await searchParams;
  return <OrderSuccess locale="fr" dict={getDict("fr")} orderNumber={r} token={t} />;
}
