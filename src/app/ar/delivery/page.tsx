import type { Metadata } from "next";
import { LegalPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { legalMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  return legalMetadata("ar", "delivery");
}

export default function ArDeliveryPage() {
  const dict = getDict("ar");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/ar` },
          { label: dict.legal.deliveryTitle, url: `${appUrl}${localePath("ar", "delivery")}` },
        ])}
      />
      <LegalPage locale="ar" dict={dict} slug="delivery" />
    </>
  );
}
