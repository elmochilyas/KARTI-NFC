import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SolutionPage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/features/vitrine/seo";
import { SOLUTION_SLUGS, localePath, solutionSlugToKey } from "@/features/vitrine/site";
import { solutionMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateStaticParams(): { slug: string }[] {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return solutionMetadata("ar", slug);
}

export default async function ArSolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = solutionSlugToKey(slug);
  if (!key) notFound();
  const dict = getDict("ar");
  const copy = dict.solutions[key];
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/ar` },
          { label: copy.name, url: `${appUrl}${localePath("ar", "solutions", slug)}` },
        ])}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(copy.faq)} />
      <SolutionPage locale="ar" dict={dict} solution={key} />
    </>
  );
}
