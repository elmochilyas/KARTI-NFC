import type { Metadata } from "next";
import { LegalPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { legalMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  return legalMetadata("ar", "terms");
}

export default function ArTermsPage() {
  const dict = getDict("ar");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/ar` },
          { label: dict.legal.termsTitle, url: `${appUrl}${localePath("ar", "terms")}` },
        ])}
      />
      <LegalPage locale="ar" dict={dict} slug="terms" />
    </>
  );
}
