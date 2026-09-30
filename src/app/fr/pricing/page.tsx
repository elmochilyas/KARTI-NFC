import type { Metadata } from "next";
import { PricingPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return staticMetadata("fr", dict.meta.pricing, ["pricing"]);
}

export default function FrPricingPage() {
  const dict = getDict("fr");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/fr` },
          { label: dict.nav.pricing, url: `${appUrl}${localePath("fr", "pricing")}` },
        ])}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(dict.pricingPage.faq)} />
      <PricingPage locale="fr" dict={dict} />
    </>
  );
}
