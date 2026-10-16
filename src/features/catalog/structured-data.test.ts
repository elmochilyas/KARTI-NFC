import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

vi.mock("./cache", () => ({
  getCachedCatalogProduct: vi.fn(),
  getCachedPublishedFlags: vi.fn(),
}));

import { getDict } from "@/features/vitrine/i18n";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import { PRODUCT_PUBLIC_SLUGS, productTypeFromSlug } from "@/features/vitrine/products";
import { localePath } from "@/features/vitrine/site";
import { getAppUrl } from "@/lib/env";
import { catalogPriceLine } from "./copy";
import { catalogPriceDecimal } from "./price";
import type { PublicCatalogProduct } from "./public";
import { productRouteJsonLd } from "./route";

const LOCALES: VitrineLocale[] = ["fr", "en", "ar"];
const PRICE_MINOR = 19900;

function catalog(productType: PublicCatalogProduct["productType"]): PublicCatalogProduct {
  const asset = productType.toLowerCase();
  return {
    productType,
    published: true,
    priceMinor: PRICE_MINOR,
    currency: "MAD",
    availability: "IN_STOCK",
    primaryImageUrl: `https://cdn.example/${asset}/primary.jpg`,
    ogImageUrl: `https://cdn.example/${asset}/og.jpg`,
    galleryImages: [],
    displayName: null,
    shortName: null,
    heroTitle: null,
    heroDescription: null,
    shortDescription: null,
    outcomeText: null,
    pricingNote: null,
    seoTitle: null,
    seoDescription: null,
    audiences: [],
    benefits: [],
    useCases: [],
    included: [],
    faqs: [],
  };
}

function offerOf(product: unknown): Record<string, unknown> {
  return (product as Record<string, unknown>).offers as Record<string, unknown>;
}

describe("Product structured data contract (all 8 products x 3 locales)", () => {
  for (const slug of PRODUCT_PUBLIC_SLUGS) {
    for (const locale of LOCALES) {
      it(`${slug} [${locale}] emits a valid Product + Offer while priced`, () => {
        const product = productTypeFromSlug(slug);
        if (!product) throw new Error(`unmapped slug ${slug}`);
        const jsonLd = productRouteJsonLd(
          { product, catalog: catalog(product), published: true },
          getDict(locale),
          slug,
          locale,
        );
        const url = `${getAppUrl()}${localePath(locale, "products", slug)}`;
        expect(jsonLd.product).not.toBeNull();
        const data = jsonLd.product as Record<string, unknown>;
        expect(data["@type"]).toBe("Product");
        expect(data.url).toBe(url);
        const offers = offerOf(data);
        expect(offers["@type"]).toBe("Offer");
        expect(offers.url).toBe(url);
        expect(offers.price).toBe(catalogPriceDecimal(PRICE_MINOR));
        expect(offers.priceCurrency).toBe("MAD");
        expect(offers.availability).toBe("https://schema.org/InStock");
        const asset = product.toLowerCase();
        expect(data.image).toEqual([
          `https://cdn.example/${asset}/primary.jpg`,
          `https://cdn.example/${asset}/og.jpg`,
        ]);
        // Never fabricated ratings/reviews.
        expect(data.review).toBeUndefined();
        expect(data.aggregateRating).toBeUndefined();
        expect(offers.review).toBeUndefined();
        expect(offers.aggregateRating).toBeUndefined();
      });
    }
  }

  it("emits gallery images first in PDP order, deduped, OG last when distinct", () => {
    const product = "PERSONAL_CARD" as const;
    const asset = product.toLowerCase();
    const row = {
      ...catalog(product),
      galleryImages: [
        { url: `https://cdn.example/${asset}/gallery-2.jpg`, alt: "Side" },
        { url: `https://cdn.example/${asset}/primary.jpg`, alt: "" },
      ],
    };
    const jsonLd = productRouteJsonLd(
      { product, catalog: row, published: true },
      getDict("fr"),
      "personal-card",
      "fr",
    );
    const data = jsonLd.product as Record<string, unknown>;
    // Gallery order kept, primary deduped (gallery copy === primaryImageUrl), OG appended.
    expect(data.image).toEqual([
      `https://cdn.example/${asset}/gallery-2.jpg`,
      `https://cdn.example/${asset}/primary.jpg`,
      `https://cdn.example/${asset}/og.jpg`,
    ]);
  });

  it("visible price and JSON-LD Offer price come from the same catalog value", () => {
    for (const slug of PRODUCT_PUBLIC_SLUGS) {
      const product = productTypeFromSlug(slug);
      if (!product) throw new Error(`unmapped slug ${slug}`);
      const row = catalog(product);
      const line = catalogPriceLine(row);
      const jsonLd = productRouteJsonLd(
        { product, catalog: row, published: true },
        getDict("fr"),
        slug,
        "fr",
      );
      expect(line).toBe(`${offerOf(jsonLd.product).price} MAD`);
    }
  });

  it("emits no Product (never a priceless Offer) when the price is not configured", () => {
    for (const slug of PRODUCT_PUBLIC_SLUGS) {
      const product = productTypeFromSlug(slug);
      if (!product) throw new Error(`unmapped slug ${slug}`);
      const jsonLd = productRouteJsonLd(
        { product, catalog: { ...catalog(product), priceMinor: null }, published: true },
        getDict("fr"),
        slug,
        "fr",
      );
      expect(jsonLd.product).toBeNull();
    }
  });

  it("keeps breadcrumb and FAQ valid even without a price", () => {
    const jsonLd = productRouteJsonLd(
      { product: "PERSONAL_CARD", catalog: null, published: true },
      getDict("fr"),
      "personal-card",
      "fr",
    );
    expect(jsonLd.product).toBeNull();
    expect(jsonLd.breadcrumb).not.toBeNull();
    expect(jsonLd.faq).not.toBeNull();
  });
});
