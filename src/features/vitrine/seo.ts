/**
 * SEO foundation (Phase 5): localized metadata, hreflang, and truthful
 * structured data. Every helper is pure and unit-tested; pages only
 * pass copy + route keys.
 */

import type { Metadata } from "next";
import { createElement } from "react";
import { getAppUrl } from "@/lib/env";
import { alternateUrls } from "./site";
import { DEFAULT_LOCALE, type VitrineLocale } from "./i18n/dict";

export type BreadcrumbItem = {
  label: string;
  url: string;
};

type PageMetadataInput = {
  locale: VitrineLocale;
  title: string;
  description: string;
  segments: string[];
  index?: boolean;
  follow?: boolean;
};

/**
 * Unique title/description + self-canonical + full hreflang set
 * (fr/ar/en + x-default → French primary) + basic Open Graph.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const appUrl = getAppUrl();
  const canonical = `${appUrl}/${input.locale}${input.segments.length > 0 ? `/${input.segments.join("/")}` : ""}`;
  const languages: Record<string, string> = {};
  for (const { locale, url } of alternateUrls(appUrl, input.segments)) {
    languages[locale] = url;
  }
  languages["x-default"] =
    `${appUrl}/${DEFAULT_LOCALE}${input.segments.length > 0 ? `/${input.segments.join("/")}` : ""}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical, languages },
    robots:
      input.index === false || input.follow === false
        ? { index: input.index !== false, follow: input.follow !== false }
        : undefined,
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: "website",
      locale: input.locale,
    },
  };
}

/** Serializable JSON-LD script payload renderer (server component). */
export function JsonLd({ id, data }: { id: string; data: unknown }) {
  return createElement("script", {
    id,
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  });
}

export function organizationJsonLd(appUrl: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    description,
    url: `${appUrl}/fr`,
  };
}

/**
 * Product markup WITHOUT price/Offer: catalog is QUOTE_REQUIRED, so any
 * Offer price would fabricate. Only what the page visibly states.
 */
export function productJsonLd(input: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.url,
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function articleJsonLd(input: { title: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: input.url,
  };
}
