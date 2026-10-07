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
  /** Absolute OG/Twitter image URLs (CMS-managed catalog images). */
  images?: string[];
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
      siteName: "Karti",
      ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
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
 * Product markup. Only call with a real configured fixed price: emits
 * Product + Offer with the exact visible price (decimal string, MAD) and
 * the real canonical image URLs — visible page price and schema price are
 * derived from the same `priceMinor`, so they always match. Products
 * without a configured price must NOT use this function at all (a
 * priceless Product trips the Search Console
 * "offers/review/aggregateRating" error). Never emits
 * review/aggregateRating.
 */
export function productJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image?: string[];
  brand?: string;
  offer?: {
    url: string;
    /** Visible decimal price, e.g. "199.00" — must equal the page price. */
    price: string;
    priceCurrency?: string;
    availability?:
      | "https://schema.org/InStock"
      | "https://schema.org/OutOfStock"
      | "https://schema.org/PreOrder";
  } | null;
}) {
  const image = (input.image ?? []).filter((src) => typeof src === "string" && src !== "");
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
  };
  if (image.length > 0) payload.image = image;
  if (input.brand) payload.brand = { "@type": "Brand", name: input.brand };
  if (input.offer) {
    payload.offers = {
      "@type": "Offer",
      url: input.offer.url,
      priceCurrency: input.offer.priceCurrency ?? "MAD",
      price: input.offer.price,
      ...(input.offer.availability ? { availability: input.offer.availability } : {}),
    };
  }
  return payload;
}

/** Map a configured catalog availability to its schema.org URL. */
export function catalogAvailabilityToSchema(
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | null,
):
  | "https://schema.org/InStock"
  | "https://schema.org/OutOfStock"
  | "https://schema.org/PreOrder"
  | undefined {
  if (availability === "IN_STOCK") return "https://schema.org/InStock";
  if (availability === "OUT_OF_STOCK") return "https://schema.org/OutOfStock";
  if (availability === "PREORDER") return "https://schema.org/PreOrder";
  return undefined;
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
