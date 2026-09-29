import type { Metadata } from "next";
import { ResourcesPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, JsonLd } from "@/features/vitrine/seo";
import { localePath } from "@/features/vitrine/site";
import { staticMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateMetadata(): Metadata {
  const dict = getDict("fr");
  return staticMetadata("fr", dict.meta.resources, ["resources"]);
}

export default function FrResourcesPage() {
  const dict = getDict("fr");
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/fr` },
          { label: dict.nav.resources, url: `${appUrl}${localePath("fr", "resources")}` },
        ])}
      />
      <ResourcesPage locale="fr" dict={dict} />
    </>
  );
}
