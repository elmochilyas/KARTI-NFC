import type { Metadata } from "next";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return {
    title: `Karti — ${dict.home.heroTitle}`,
    description: dict.home.heroSubtitle,
    alternates: { canonical: `${getAppUrl()}/en` },
  };
}

export default function EnHomePage() {
  return <HomePage locale="en" dict={getDict("en")} />;
}
