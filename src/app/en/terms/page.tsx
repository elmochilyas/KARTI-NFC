import type { Metadata } from "next";
import { LegalPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { legalMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  return legalMetadata("en", "terms");
}

export default function EnTermsPage() {
  const dict = getDict("en");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/en` },
          { label: dict.legal.termsTitle, url: `${appUrl}${localePath("en", "terms")}` },
        ])}
      />
      <LegalPage locale="en" dict={dict} slug="terms" />
    </>
  );
}
