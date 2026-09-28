import type { Metadata } from "next";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return {
    title: `Karti — ${dict.home.heroTitle}`,
    description: dict.home.heroSubtitle,
    alternates: { canonical: `${getAppUrl()}/ar` },
  };
}

export default function ArHomePage() {
  return <HomePage locale="ar" dict={getDict("ar")} />;
}
