import { describe, expect, it } from "vitest";
import { getDict } from "@/features/vitrine/i18n";
import {
  catalogOfferForJsonLd,
  catalogOrderUnitLine,
  catalogPriceLine,
  resolveProductCopy,
} from "./copy";
import type { PublicCatalogProduct } from "./public";

function pricedCatalog(overrides?: Partial<PublicCatalogProduct>): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    pricingMode: "FIXED",
    priceMinor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primaryImageUrl: "https://cdn.example/catalog/personal/primary/abc.jpg",
    ogImageUrl: null,
    displayName: "Carte Personnelle",
    shortName: null,
    heroTitle: null,
    heroDescription: null,
    shortDescription: null,
    outcomeText: "Partagez vos coordonnées d'un geste.",
    pricingNote: null,
    seoTitle: null,
    seoDescription: null,
    audiences: [],
    benefits: [],
    useCases: [],
    included: [],
    faqs: [],
    ...overrides,
  };
}

describe("catalog copy merge", () => {
  it("falls back to static copy when the catalog is unreachable", () => {
    const dict = getDict("fr");
    const merged = resolveProductCopy(dict.products.PERSONAL_CARD, null);
    expect(merged).toEqual(dict.products.PERSONAL_CARD);
  });

  it("prefers non-empty CMS overrides and keeps static structure", () => {
    const dict = getDict("fr");
    const merged = resolveProductCopy(dict.products.PERSONAL_CARD, pricedCatalog());
    expect(merged.name).toBe("Carte Personnelle");
    expect(merged.outcome).toBe("Partagez vos coordonnées d'un geste.");
    // Untouched CMS fields fall back; structure (steps, tagline source) preserved.
    expect(merged.steps).toEqual(dict.products.PERSONAL_CARD.steps);
    expect(merged.tapEffect).toBe(dict.products.PERSONAL_CARD.tapEffect);
  });

  it("ignores blank CMS strings and empty lists", () => {
    const dict = getDict("fr");
    const merged = resolveProductCopy(
      dict.products.PERSONAL_CARD,
      pricedCatalog({ displayName: "   ", audiences: [], faqs: [] }),
    );
    expect(merged.name).toBe(dict.products.PERSONAL_CARD.name);
    expect(merged.audience).toEqual(dict.products.PERSONAL_CARD.audience);
    expect(merged.faq).toEqual(dict.products.PERSONAL_CARD.faq);
  });

  it("uses CMS lists and FAQs when present", () => {
    const dict = getDict("fr");
    const merged = resolveProductCopy(
      dict.products.PERSONAL_CARD,
      pricedCatalog({ benefits: ["Fast tap"], faqs: [{ q: "Q?", a: "A." }] }),
    );
    expect(merged.benefits).toEqual(["Fast tap"]);
    expect(merged.faq).toEqual([{ q: "Q?", a: "A." }]);
  });
});

describe("catalog price lines", () => {
  it("returns null for QUOTE (request-price fallback applies)", () => {
    expect(catalogPriceLine(pricedCatalog({ pricingMode: "QUOTE", priceMinor: null }))).toBeNull();
    expect(catalogPriceLine(null)).toBeNull();
  });

  it("matches the visible FIXED price exactly", () => {
    expect(catalogPriceLine(pricedCatalog())).toBe("199.00 MAD");
  });
});

describe("catalog JSON-LD offer", () => {
  const url = "https://karti.pro/fr/products/personal-card";

  it("emits no Offer without a real price (QUOTE stays a bare Product)", () => {
    expect(
      catalogOfferForJsonLd(pricedCatalog({ pricingMode: "QUOTE", priceMinor: null }), url),
    ).toBeNull();
    expect(catalogOfferForJsonLd(null, url)).toBeNull();
  });

  it("emits an Offer whose price equals the visible page price", () => {
    const offer = catalogOfferForJsonLd(pricedCatalog(), url);
    expect(offer).toMatchObject({ url, price: "199.00", priceCurrency: "MAD" });
    // Visible line and schema price come from the same 19900 minor units.
    expect(catalogPriceLine(pricedCatalog())).toContain(offer?.price ?? "missing");
  });

  it("never fabricates reviews, ratings, or availability", () => {
    const offer = catalogOfferForJsonLd(pricedCatalog({ availability: null }), url) as Record<
      string,
      unknown
    >;
    expect(offer).not.toHaveProperty("review");
    expect(offer).not.toHaveProperty("aggregateRating");
    expect(offer).not.toHaveProperty("availability");
  });

  it("passes through only real configured availability", () => {
    const withStock = catalogOfferForJsonLd(pricedCatalog({ availability: "IN_STOCK" }), url);
    expect(withStock?.availability).toBe("https://schema.org/InStock");
    const withoutStock = catalogOfferForJsonLd(pricedCatalog({ availability: null }), url);
    expect(withoutStock).not.toHaveProperty("availability");
  });
});

describe("catalog order unit lines", () => {
  it("snapshots unit × quantity with integer math", () => {
    expect(catalogOrderUnitLine(pricedCatalog(), 2)).toBe("199.00 MAD × 2 = 398.00 MAD");
  });

  it("returns null for QUOTE (order stays quote-based)", () => {
    expect(
      catalogOrderUnitLine(pricedCatalog({ pricingMode: "QUOTE", priceMinor: null }), 1),
    ).toBeNull();
  });
});
