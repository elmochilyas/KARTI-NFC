import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/features/vitrine/marketing/InfoPages";
import { getDict } from "@/features/vitrine/i18n";
import { getAppUrl } from "@/lib/env";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  JsonLd,
} from "@/features/vitrine/seo";
import { articlePath, localePath } from "@/features/vitrine/site";
import { ARTICLE_SLUGS, type ArticleSlug } from "@/features/vitrine/site";
import { articleMetadata } from "@/features/vitrine/marketing/routeMeta";

export function generateStaticParams(): { slug: string }[] {
  return ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("fr", slug);
}

export default async function FrArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(ARTICLE_SLUGS as readonly string[]).includes(slug)) notFound();
  const articleSlug = slug as ArticleSlug;
  const dict = getDict("fr");
  const article = dict.articles[articleSlug];
  const appUrl = getAppUrl();
  const url = `${appUrl}${articlePath("fr", articleSlug)}`;
  return (
    <>
      <JsonLd
        id="karti-jsonld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: dict.common.home, url: `${appUrl}/fr` },
          { label: dict.nav.resources, url: `${appUrl}${localePath("fr", "resources")}` },
          { label: article.title, url },
        ])}
      />
      <JsonLd
        id="karti-jsonld-article"
        data={articleJsonLd({ title: article.title, description: article.description, url })}
      />
      <JsonLd id="karti-jsonld-faq" data={faqJsonLd(article.faq)} />
      <ArticlePage locale="fr" dict={dict} slug={articleSlug} />
    </>
  );
}
