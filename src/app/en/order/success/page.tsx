import type { Metadata } from "next";
import { getDict } from "@/features/vitrine/i18n";
import { OrderSuccess } from "@/features/vitrine/order/OrderSuccess";

export function generateMetadata(): Metadata {
  return {
    title: `${getDict("en").success.title} — Karti`,
    robots: { index: false, follow: false },
  };
}

export default async function EnOrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; t?: string }>;
}) {
  const { r, t } = await searchParams;
  return <OrderSuccess locale="en" dict={getDict("en")} orderNumber={r} token={t} />;
}
