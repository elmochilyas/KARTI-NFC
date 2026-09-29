import type { Metadata } from "next";
import { FaqHubPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("ar");
  return staticMetadata("ar", dict.meta.faq, ["faq"]);
}

export default function ArFaqPage() {
  const dict = getDict("ar");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/ar` },
          { label: dict.nav.faq, url: `${appUrl}${localePath("ar", "faq")}` },
        ])}
      />
      <JsonLd
        id="karti-jsonld-faq"
        data={faqJsonLd(dict.faqHub.categories.flatMap((category) => category.items))}
      />
      <FaqHubPage locale="ar" dict={dict} />
    </>
  );
}
