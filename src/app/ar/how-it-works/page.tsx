import type { Metadata } from "next";
import { HowPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return staticMetadata("ar", dict.meta.howItWorks, ["how-it-works"]);
}

export default function ArHowItWorksPage() {
  const dict = getDict("ar");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/ar` },
          { label: dict.nav.howItWorks, url: `${appUrl}${localePath("ar", "how-it-works")}` },
        ])}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(dict.howItWorks.faq)} />
      <HowPage locale="ar" dict={dict} />
    </>
  );
}
