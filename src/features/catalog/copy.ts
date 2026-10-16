import { formatMinorToMad } from "@/domain/orders/money";
import type { ProductCopy } from "@/features/vitrine/i18n/dict";
import { catalogPriceDecimal, catalogPriceDisplay } from "./price";
import type { PublicCatalogProduct } from "./public";

/**
 * Merge static dict copy (fallback, always present) with CMS overrides.
 * CMS values win only when non-empty; static copy otherwise. Design and
 * structure never change — only the words.
 */
export function resolveProductCopy(
  staticCopy: ProductCopy,
  catalog: PublicCatalogProduct | null,
): ProductCopy {
  if (!catalog) return staticCopy;
  const pick = (cms: string | null, fallback: string): string => {
    const trimmed = cms?.trim() ?? "";
    return trimmed !== "" ? trimmed : fallback;
  };
  const pickList = (cms: string[], fallback: string[]): string[] =>
    cms.length > 0 ? cms : fallback;
  return {
    name: pick(catalog.displayName, staticCopy.name),
    tagline: pick(catalog.shortDescription, staticCopy.tagline),
    outcome: pick(catalog.outcomeText, staticCopy.outcome),
    tapEffect: staticCopy.tapEffect,
    audienceTitle: staticCopy.audienceTitle,
    audience: pickList(catalog.audiences, staticCopy.audience),
    benefitsTitle: staticCopy.benefitsTitle,
    benefits: pickList(catalog.benefits, staticCopy.benefits),
    stepsTitle: staticCopy.stepsTitle,
    steps: staticCopy.steps,
    pricing: pick(catalog.pricingNote, staticCopy.pricing),
    faq: catalog.faqs.length > 0 ? catalog.faqs : staticCopy.faq,
    problem: staticCopy.problem,
    useCases: pickList(catalog.useCases, staticCopy.useCases),
    customization: staticCopy.customization,
    included: pickList(catalog.included, staticCopy.included),
  };
}

export type ProductLandingTexts = {
  /** PDP H1: hero title → display name → static name. */
  title: string;
  /** Short pitch under the H1: CMS short description → static tagline. */
  tagline: string;
  /** Raw CMS short description (null when unset) for compact placements. */
  shortDescription: string | null;
  /** Full PDP description: hero description → outcome text → static outcome. */
  description: string;
};

/**
 * PDP title/description resolution (pure). Surfaces the CMS hero fields
 * that `resolveProductCopy` deliberately leaves out of the shared
 * ProductCopy shape, so the buy panel shows a real title + description.
 */
export function resolveProductLanding(
  staticCopy: ProductCopy,
  catalog: PublicCatalogProduct | null,
): ProductLandingTexts {
  if (!catalog) {
    return {
      title: staticCopy.name,
      tagline: staticCopy.tagline,
      shortDescription: null,
      description: staticCopy.outcome,
    };
  }
  const clean = (value: string | null): string | null => {
    const trimmed = value?.trim() ?? "";
    return trimmed !== "" ? trimmed : null;
  };
  return {
    title: clean(catalog.heroTitle) ?? clean(catalog.displayName) ?? staticCopy.name,
    tagline: clean(catalog.shortDescription) ?? staticCopy.tagline,
    shortDescription: clean(catalog.shortDescription),
    description: clean(catalog.heroDescription) ?? clean(catalog.outcomeText) ?? staticCopy.outcome,
  };
}

/** Visible fixed price line for a product card / pricing section, or null when unconfigured. */
export function catalogPriceLine(catalog: PublicCatalogProduct | null): string | null {
  if (!catalog) return null;
  return catalogPriceDisplay({ priceMinor: catalog.priceMinor });
}

/**
 * JSON-LD Offer payload for a catalog product, or null when no truthful
 * Offer exists (price not configured). The price decimal comes from the
 * same `priceMinor` as the visible line, so schema and page match.
 */
export function catalogOfferForJsonLd(
  catalog: PublicCatalogProduct | null,
  url: string,
): {
  url: string;
  price: string;
  priceCurrency: string;
  availability?:
    "https://schema.org/InStock" | "https://schema.org/OutOfStock" | "https://schema.org/PreOrder";
} | null {
  if (!catalog || catalog.priceMinor === null) return null;
  const price = catalogPriceDecimal(catalog.priceMinor);
  if (price === null) return null;
  const availability =
    catalog.availability === "IN_STOCK"
      ? ("https://schema.org/InStock" as const)
      : catalog.availability === "OUT_OF_STOCK"
        ? ("https://schema.org/OutOfStock" as const)
        : catalog.availability === "PREORDER"
          ? ("https://schema.org/PreOrder" as const)
          : undefined;
  return {
    url,
    price,
    priceCurrency: catalog.currency,
    ...(availability ? { availability } : {}),
  };
}

/** Order-wizard unit line: "199.00 MAD × 2 = 398.00 MAD" snapshot, or null when unconfigured. */
export function catalogOrderUnitLine(
  catalog: PublicCatalogProduct | { priceMinor: number | null } | null,
  quantity: number,
): string | null {
  if (!catalog || catalog.priceMinor === null) return null;
  const unit = formatMinorToMad(catalog.priceMinor);
  if (unit === "—") return null;
  const subtotal = catalog.priceMinor * quantity;
  const subtotalText = formatMinorToMad(subtotal);
  if (subtotalText === "—") return null;
  return `${unit} × ${quantity} = ${subtotalText}`;
}
