import type { Metadata } from "next";
import { ExamplesHubPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("en");
  return staticMetadata("en", dict.meta.examples, ["examples"]);
}

export default function EnExamplesPage() {
  const dict = getDict("en");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/en` },
          { label: dict.nav.examples, url: `${appUrl}${localePath("en", "examples")}` },
        ])}
      />
      <ExamplesHubPage locale="en" dict={dict} />
    </>
  );
}
