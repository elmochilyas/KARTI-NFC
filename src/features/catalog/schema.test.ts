import { describe, expect, it } from "vitest";
import {
  catalogLocalizationSchema,
  catalogMediaReorderSchema,
  catalogProductUpdateSchema,
} from "./schema";

describe("catalog product update validation", () => {
  it("accepts a decimal MAD price", () => {
    const parsed = catalogProductUpdateSchema.safeParse({
      published: true,
      priceMad: "249.50",
      availability: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty price while the price is not configured", () => {
    expect(
      catalogProductUpdateSchema.safeParse({
        published: false,
        priceMad: null,
        availability: null,
      }).success,
    ).toBe(true);
    expect(
      catalogProductUpdateSchema.safeParse({
        published: true,
        priceMad: "",
        availability: "IN_STOCK",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown fields such as pricing modes (single price model only)", () => {
    expect(
      catalogProductUpdateSchema.safeParse({
        published: true,
        pricingMode: "FIXED", // pricing-guard-allow: pricingMode
        priceMad: "199",
        availability: null,
      }).success,
    ).toBe(false);
  });
});

describe("catalog localization validation", () => {
  const valid = {
    productType: "PERSONAL_CARD",
    locale: "fr",
    displayName: "Carte Personnelle",
    shortName: null,
    heroTitle: null,
    heroDescription: null,
    shortDescription: null,
    outcomeText: null,
    pricingNote: null,
    seoTitle: null,
    seoDescription: null,
    audiences: ["Freelancers"],
    benefits: [],
    useCases: [],
    included: [],
    faqs: [{ q: "Q?", a: "A." }],
  };

  it("accepts bounded localized content", () => {
    expect(catalogLocalizationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects raw HTML and scriptable content", () => {
    expect(
      catalogLocalizationSchema.safeParse({ ...valid, displayName: "<img src=x>" }).success,
    ).toBe(false);
    expect(
      catalogLocalizationSchema.safeParse({
        ...valid,
        faqs: [{ q: "Q?", a: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
  });

  it("rejects oversized arrays and overlong items (no page-builder drift)", () => {
    expect(
      catalogLocalizationSchema.safeParse({
        ...valid,
        audiences: Array.from({ length: 13 }, (_, i) => `Audience ${i}`),
      }).success,
    ).toBe(false);
    expect(
      catalogLocalizationSchema.safeParse({
        ...valid,
        benefits: ["x".repeat(201)],
      }).success,
    ).toBe(false);
    expect(
      catalogLocalizationSchema.safeParse({
        ...valid,
        faqs: Array.from({ length: 21 }, (_, i) => ({ q: `Q${i}?`, a: "A." })),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown locales and product types", () => {
    expect(catalogLocalizationSchema.safeParse({ ...valid, locale: "es" }).success).toBe(false);
    expect(
      catalogLocalizationSchema.safeParse({ ...valid, productType: "GOLD_CARD" }).success,
    ).toBe(false);
  });
});

describe("catalog media reorder validation", () => {
  it("requires the exact UUID id set (same discipline as link reorder)", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(
      catalogMediaReorderSchema.safeParse({ productType: "PERSONAL_CARD", orderedIds: [id] })
        .success,
    ).toBe(true);
    expect(
      catalogMediaReorderSchema.safeParse({ productType: "PERSONAL_CARD", orderedIds: ["nope"] })
        .success,
    ).toBe(false);
  });
});
