import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDict } from "@/features/vitrine/i18n";
import { HomePage } from "@/features/vitrine/HomePage";
import { ProductPage } from "@/features/vitrine/ProductPage";
import type { PublicCatalogProduct } from "./public";

function fixedCatalog(): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    pricingMode: "FIXED",
    priceMinor: 19900,
    currency: "MAD",
    availability: null,
    primaryImageUrl: "https://cdn.example/primary.jpg",
    ogImageUrl: null,
    displayName: "Carte Personnelle",
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

describe("catalog public pages", () => {
  it("preserves the approved design when the catalog is unreachable (QUOTE fallback)", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(ProductPage({ locale: "fr", dict, slug: "personal-card" }));
    expect(html).toContain(dict.common.requestPrice);
    expect(html).not.toContain("199.00 MAD");
    expect(html).not.toContain("undefined");
  });

  it("shows the real configured price and CMS name when FIXED", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).toContain("Carte Personnelle");
    expect(html).toContain("https://cdn.example/primary.jpg");
  });

  it("keeps the request-price fallback for QUOTE products", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: { ...fixedCatalog(), pricingMode: "QUOTE", priceMinor: null },
      }),
    );
    expect(html).toContain(dict.common.requestPrice);
    expect(html).not.toContain("199.00 MAD");
  });

  it("removes unpublished products from related grids", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        publishedFlags: { ...ALL_PUBLISHED, CAREER_CARD: false, CONTACT_CARD: false },
      }),
    );
    expect(html).not.toContain("/fr/products/career-card");
  });

  it("homepage lists all products with no invented prices by default", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(HomePage({ locale: "fr", dict }));
    expect(html).toContain(dict.products.PERSONAL_CARD.name);
    expect(html).not.toContain("undefined");
  });

  it("homepage shows real prices and hides unpublished products", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      HomePage({
        locale: "fr",
        dict,
        publishedFlags: { ...ALL_PUBLISHED, CONTACT_CARD: false },
        priceLines: { PERSONAL_CARD: "199.00 MAD" },
      }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).not.toContain("/fr/products/contact-card");
  });

  it("renders identically in RTL without breaking layout markers", () => {
    const dict = getDict("ar");
    const html = renderToStaticMarkup(
      ProductPage({ locale: "ar", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).not.toContain("undefined");
  });
});
