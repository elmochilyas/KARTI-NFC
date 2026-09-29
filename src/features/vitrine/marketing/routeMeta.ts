/**
 * Thin generateMetadata helpers for locale routes (server-only).
 * Copy comes from the typed dicts; paths from the site registry.
 */

import type { Metadata } from "next";
import { getDict } from "../i18n";
import type { VitrineLocale } from "../i18n/dict";
import { pageMetadata } from "../seo";
import { solutionSlugToKey } from "../site";
import type { ArticleSlug } from "../site";

const NOT_FOUND_META: Metadata = {
  title: "Karti",
  robots: { index: false, follow: false },
};

export function staticMetadata(
  locale: VitrineLocale,
  meta: { title: string; description: string },
  segments: string[],
): Metadata {
  return pageMetadata({ locale, title: meta.title, description: meta.description, segments });
}

export function solutionMetadata(locale: VitrineLocale, slug: string): Metadata {
  const key = solutionSlugToKey(slug);
  if (!key) return NOT_FOUND_META;
  const dict = getDict(locale);
  const meta = {
    professionals: dict.meta.solutionsProfessionals,
    students: dict.meta.solutionsStudents,
    businesses: dict.meta.solutionsBusinesses,
  }[key];
  return staticMetadata(locale, meta, ["solutions", slug]);
}

export function articleMetadata(locale: VitrineLocale, slug: string): Metadata {
  const dict = getDict(locale);
  const known = (["nfc-vs-qr", "get-review-link", "destination-change"] as const).includes(
    slug as ArticleSlug,
  );
  if (!known) return NOT_FOUND_META;
  const article = dict.articles[slug as ArticleSlug];
  return staticMetadata(locale, { title: article.title, description: article.description }, [
    "resources",
    slug,
  ]);
}

export function legalMetadata(locale: VitrineLocale, slug: "privacy" | "terms" | "delivery"): Metadata {
  const dict = getDict(locale);
  const meta = {
    privacy: dict.meta.legalPrivacy,
    terms: dict.meta.legalTerms,
    delivery: dict.meta.legalDelivery,
  }[slug];
  return staticMetadata(locale, meta, [slug]);
}
