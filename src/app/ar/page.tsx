import type { Metadata } from "next";
import { HomePage } from "@/features/vitrine/HomePage";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { JsonLd, organizationJsonLd, pageMetadata } from "@/features/vitrine/seo";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return pageMetadata({
    locale: "ar",
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    segments: [],
  });
}

export default function ArHomePage() {
  const dict = getDict("ar");
  return (
    <>
      <JsonLd
        id="karti-jsonld-organization"
        data={organizationJsonLd(getAppUrl(), "Karti", dict.meta.home.description)}
      />
      <HomePage locale="ar" dict={dict} />
    </>
  );
}
