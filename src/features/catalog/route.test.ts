import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { getCachedCatalogProduct, getCachedPublishedFlags } from "./cache";
import type { PublicCatalogProduct } from "./public";
import { getHomeCatalogData, getProductRoute, productRouteJsonLd } from "./route";

const ALL_PUBLISHED = {
  PERSONAL_CARD: true,
  CAREER_CARD: true,
  BUSINESS_CARD: true,
  GOOGLE_REVIEW_CARD: true,
  WHATSAPP_CARD: true,
  INSTAGRAM_CARD: true,
  CONTACT_CARD: true,
  CUSTOM_LINK_CARD: true,
} as const;

function fixedCatalog(): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    priceMinor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primaryImageUrl: "https://cdn.example/primary.jpg",
    ogImageUrl: "https://cdn.example/og.jpg",
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

describe("product route loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({ ...ALL_PUBLISHED });
    vi.mocked(getCachedCatalogProduct).mockResolvedValue(null);
  });

  it("resolves unknown slugs to null (page renders notFound)", async () => {
    await expect(getProductRoute("nope", "fr")).resolves.toBeNull();
    expect(getCachedCatalogProduct).not.toHaveBeenCalled();
  });

  it("marks unpublished products (page renders noindex, no Offer)", async () => {
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({
      ...ALL_PUBLISHED,
      PERSONAL_CARD: false,
    });
    const route = await getProductRoute("personal-card", "fr");
    expect(route?.product).toBe("PERSONAL_CARD");
    expect(route?.published).toBe(false);
    expect(route?.catalog).toBeNull();
  });

  it("returns the published catalog row for order/display use", async () => {
    vi.mocked(getCachedCatalogProduct).mockResolvedValue(fixedCatalog());
    const route = await getProductRoute("personal-card", "fr");
    expect(route?.published).toBe(true);
    expect(route?.catalog?.priceMinor).toBe(19900);
  });
});

describe("product JSON-LD route builder", () => {
  const dict = getDict("fr");

  it("emits NO Product markup while the price is not configured (Search Console stays error-free by construction)", () => {
    const jsonLd = productRouteJsonLd(
      { product: "PERSONAL_CARD", catalog: null, published: true },
      dict,
      "personal-card",
      "fr",
    );
    expect(jsonLd.product).toBeNull();
  });

  it("emits Product + Offer with matching price and real images when priced", () => {
    const jsonLd = productRouteJsonLd(
      { product: "PERSONAL_CARD", catalog: fixedCatalog(), published: true },
      dict,
      "personal-card",
      "fr",
    );
    const product = jsonLd.product as Record<string, unknown>;
    const offers = product.offers as Record<string, unknown>;
    expect(offers.price).toBe("199.00");
    expect(offers.priceCurrency).toBe("MAD");
    expect(product.image).toEqual([
      "https://cdn.example/primary.jpg",
      "https://cdn.example/og.jpg",
    ]);
  });

  it("emits no Product markup for unpublished products even with a configured price", () => {
    const jsonLd = productRouteJsonLd(
      { product: "PERSONAL_CARD", catalog: fixedCatalog(), published: false },
      dict,
      "personal-card",
      "fr",
    );
    expect(jsonLd.product).toBeNull();
  });
});

describe("homepage catalog data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({ ...ALL_PUBLISHED });
    vi.mocked(getCachedCatalogProduct).mockResolvedValue(null);
  });

  it("returns no price lines while prices are not configured", async () => {
    const { flags, priceLines } = await getHomeCatalogData("fr");
    expect(flags.PERSONAL_CARD).toBe(true);
    expect(priceLines).toEqual({});
  });

  it("exposes one line per priced product and skips unpublished", async () => {
    vi.mocked(getCachedPublishedFlags).mockResolvedValue({
      ...ALL_PUBLISHED,
      CAREER_CARD: false,
    });
    vi.mocked(getCachedCatalogProduct).mockImplementation(async (product) =>
      product === "PERSONAL_CARD" ? fixedCatalog() : null,
    );
    const { flags, priceLines } = await getHomeCatalogData("fr");
    expect(flags.CAREER_CARD).toBe(false);
    expect(priceLines.PERSONAL_CARD).toBe("199.00 MAD");
    expect(priceLines.CAREER_CARD).toBeUndefined();
  });
});
