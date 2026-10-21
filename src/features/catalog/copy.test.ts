import { describe, expect, it } from "vitest";
import { getDict } from "@/features/vitrine/i18n";
import {
  catalogOfferForJsonLd,
  catalogOrderUnitLine,
  catalogPriceLine,
  resolveProductCopy,
  resolveProductLanding,
} from "./copy";
import type { PublicCatalogProduct } from "./public";

function pricedCatalog(overrides?: Partial<PublicCatalogProduct>): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    priceMinor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primaryImageUrl: "https://cdn.example/catalog/personal/primary/abc.jpg",
    primaryImageAlt: null,
    cardPreviewImage: null,
    gallery: [],
    ogImageUrl: null,
    galleryImages: [],
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

describe("product landing texts", () => {
  it("falls back to static copy without a catalog row", () => {
    const dict = getDict("fr");
    const landing = resolveProductLanding(dict.products.PERSONAL_CARD, null);
    expect(landing.title).toBe(dict.products.PERSONAL_CARD.name);
    expect(landing.tagline).toBe(dict.products.PERSONAL_CARD.tagline);
    expect(landing.shortDescription).toBeNull();
    expect(landing.description).toBe(dict.products.PERSONAL_CARD.outcome);
  });

  it("prefers hero title, short description, and hero description", () => {
    const dict = getDict("fr");
    const landing = resolveProductLanding(
      dict.products.PERSONAL_CARD,
      pricedCatalog({
        heroTitle: "Titre héros",
        shortDescription: "Pitch court",
        heroDescription: "Description complète",
      }),
    );
    expect(landing.title).toBe("Titre héros");
    expect(landing.tagline).toBe("Pitch court");
    expect(landing.shortDescription).toBe("Pitch court");
    expect(landing.description).toBe("Description complète");
  });

  it("falls back per field (display name → name, outcome → description)", () => {
    const dict = getDict("fr");
    const landing = resolveProductLanding(dict.products.PERSONAL_CARD, pricedCatalog());
    // Fixture has displayName + outcomeText but no hero fields.
    expect(landing.title).toBe("Carte Personnelle");
    expect(landing.description).toBe("Partagez vos coordonnées d'un geste.");
  });

  it("ignores blank CMS strings", () => {
    const dict = getDict("fr");
    const landing = resolveProductLanding(
      dict.products.PERSONAL_CARD,
      pricedCatalog({ heroTitle: "   ", heroDescription: "", shortDescription: "  " }),
    );
    expect(landing.title).toBe("Carte Personnelle");
    // Blank hero fields fall back per field: display name, then outcome text.
    expect(landing.description).toBe("Partagez vos coordonnées d'un geste.");
  });
});

describe("catalog price lines", () => {
  it("returns null while the price is not configured", () => {
    expect(catalogPriceLine(pricedCatalog({ priceMinor: null }))).toBeNull();
    expect(catalogPriceLine(null)).toBeNull();
  });

  it("matches the visible fixed price exactly", () => {
    expect(catalogPriceLine(pricedCatalog())).toBe("199.00 MAD");
  });
});

describe("catalog JSON-LD offer", () => {
  const url = "https://karti.pro/fr/products/personal-card";

  it("emits no Offer without a real price (no Product markup applies)", () => {
    expect(catalogOfferForJsonLd(pricedCatalog({ priceMinor: null }), url)).toBeNull();
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

  it("returns null while unconfigured (ordering stays blocked)", () => {
    expect(catalogOrderUnitLine(pricedCatalog({ priceMinor: null }), 1)).toBeNull();
  });
});
