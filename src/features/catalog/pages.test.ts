import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDict } from "@/features/vitrine/i18n";
import { HomePage } from "@/features/vitrine/HomePage";
import { ProductLandingPage } from "@/features/vitrine/product/landing";
import type { PublicCatalogProduct } from "./public";

function fixedCatalog(): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    priceMinor: 19900,
    currency: "MAD",
    availability: null,
    primaryImageUrl: "https://cdn.example/primary.jpg",
    ogImageUrl: null,
    galleryImages: [{ url: "https://cdn.example/primary.jpg", alt: "Carte Karti" }],
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
  it("preserves an honest pending state when the catalog is unreachable", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card" }),
    );
    expect(html).toContain(dict.order.pricePending);
    expect(html).toContain(dict.productPage.galleryEmpty);
    expect(html).not.toContain("199.00 MAD");
    expect(html).not.toContain("undefined");
  });

  it("shows the real configured price and CMS name when priced", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).toContain("Carte Personnelle");
    // Served through the Next.js image pipeline (remote-optimized).
    expect(html).toContain("/_next/image");
    expect(html).toContain("cdn.example%2Fprimary.jpg");
  });

  it("keeps the honest pending state while the price is not configured", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: { ...fixedCatalog(), priceMinor: null },
      }),
    );
    expect(html).toContain(dict.order.pricePending);
    expect(html).not.toContain("199.00 MAD");
  });

  it("shows only supplied related cards (unpublished entries excluded upstream)", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        relatedCards: [
          {
            product: "BUSINESS_CARD",
            name: null,
            priceLine: "199.00 MAD",
            imageUrl: "https://cdn.example/business.jpg",
            imageAlt: "",
          },
        ],
      }),
    );
    expect(html).toContain("/fr/products/business-card");
    expect(html).toContain("199.00 MAD");
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

  it("renders the gallery in a 4:3 frame with cover fit", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    // 4:3 container reserves layout space (no CLS), cover fit.
    expect(html).toContain("aspect-[4/3]");
    expect(html).toContain("object-cover");
  });

  it("renders identically in RTL without breaking layout markers", () => {
    const dict = getDict("ar");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "ar", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).not.toContain("undefined");
  });
});
