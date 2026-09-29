/**
 * Public marketing site registry (Phase 5). Single source of truth for
 * every indexable route: header/footer/sitemap/hreflang/language
 * switcher AND the link-integrity tests all derive from here, so no
 * dead-end or nonexistent pages can ship silently.
 *
 * Path slugs are locale-invariant by design (spec 06 §12, user prompt
 * §48); only copy is localized.
 */

import { VITRINE_LOCALES, type SolutionKey, type VitrineLocale } from "./i18n/dict";
import { PRODUCT_PUBLIC_SLUGS, type ProductPublicSlug } from "./products";

export type SolutionSlug = "professionals" | "students-job-seekers" | "businesses";

export const SOLUTION_SLUGS: readonly SolutionSlug[] = [
  "professionals",
  "students-job-seekers",
  "businesses",
];

/** URL slug → dict key (dict uses "students", URLs use "students-job-seekers"). */
export function solutionSlugToKey(slug: string): SolutionKey | null {
  switch (slug) {
    case "professionals":
      return "professionals";
    case "students-job-seekers":
      return "students";
    case "businesses":
      return "businesses";
    default:
      return null;
  }
}

/** Dict key → URL slug. */
export function solutionKeyToSlug(key: SolutionKey): SolutionSlug {
  switch (key) {
    case "professionals":
      return "professionals";
    case "students":
      return "students-job-seekers";
    case "businesses":
      return "businesses";
  }
}

export type ArticleSlug = "nfc-vs-qr" | "get-review-link" | "destination-change";

export const ARTICLE_SLUGS: readonly ArticleSlug[] = [
  "nfc-vs-qr",
  "get-review-link",
  "destination-change",
];

export type LegalSlug = "privacy" | "terms" | "delivery";

export const LEGAL_SLUGS: readonly LegalSlug[] = ["privacy", "terms", "delivery"];

/** Locale-prefixed path for a marketing route. */
export function localePath(locale: VitrineLocale, ...segments: string[]): string {
  const clean = segments.map((segment) => segment.replace(/^\/+|\/+$/g, "")).filter(Boolean);
  return `/${locale}${clean.length > 0 ? `/${clean.join("/")}` : ""}`;
}

export function productPath(locale: VitrineLocale, slug: ProductPublicSlug): string {
  return localePath(locale, "products", slug);
}

export function solutionPath(locale: VitrineLocale, slug: SolutionSlug): string {
  return localePath(locale, "solutions", slug);
}

export function articlePath(locale: VitrineLocale, slug: ArticleSlug): string {
  return localePath(locale, "resources", slug);
}

export function legalPath(locale: VitrineLocale, slug: LegalSlug): string {
  return localePath(locale, slug);
}

export function orderPath(locale: VitrineLocale, product?: ProductPublicSlug): string {
  return product ? localePath(locale, "order") + `?product=${product}` : localePath(locale, "order");
}

/** Every indexable marketing page (sitemap + hreflang source). */
export type IndexableRoute = {
  key: string;
  segments: string[];
};

function productRoutes(): IndexableRoute[] {
  return PRODUCT_PUBLIC_SLUGS.map((slug) => ({
    key: `product:${slug}`,
    segments: ["products", slug],
  }));
}

function solutionRoutes(): IndexableRoute[] {
  return SOLUTION_SLUGS.map((slug) => ({
    key: `solution:${slug}`,
    segments: ["solutions", slug],
  }));
}

function articleRoutes(): IndexableRoute[] {
  return ARTICLE_SLUGS.map((slug) => ({
    key: `article:${slug}`,
    segments: ["resources", slug],
  }));
}

function legalRoutes(): IndexableRoute[] {
  return LEGAL_SLUGS.map((slug) => ({ key: `legal:${slug}`, segments: [slug] }));
}

const STATIC_ROUTES: IndexableRoute[] = [
  { key: "home", segments: [] },
  { key: "how-it-works", segments: ["how-it-works"] },
  { key: "pricing", segments: ["pricing"] },
  { key: "examples", segments: ["examples"] },
  { key: "faq", segments: ["faq"] },
  { key: "resources", segments: ["resources"] },
  { key: "contact", segments: ["contact"] },
];

export function indexableRoutes(): IndexableRoute[] {
  return [
    ...STATIC_ROUTES,
    ...productRoutes(),
    ...solutionRoutes(),
    ...articleRoutes(),
    ...legalRoutes(),
  ];
}

/** Absolute URLs of one route across all locales (hreflang source). */
export function alternateUrls(
  appUrl: string,
  segments: string[],
): { locale: VitrineLocale; url: string }[] {
  return VITRINE_LOCALES.map((locale) => ({
    locale,
    url: `${appUrl}${localePath(locale, ...segments)}`,
  }));
}
