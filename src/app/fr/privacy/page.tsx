import type { Metadata } from "next";
import { LegalPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { legalMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  return legalMetadata("fr", "privacy");
}

export default function FrPrivacyPage() {
  const dict = getDict("fr");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/fr` },
          { label: dict.legal.privacyTitle, url: `${appUrl}${localePath("fr", "privacy")}` },
        ])}
      />
      <LegalPage locale="fr" dict={dict} slug="privacy" />
    </>
  );
}
