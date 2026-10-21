import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { getDict } from "@/features/vitrine/i18n";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
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
    primaryImageAlt: null,
    cardPreviewImage: null,
    gallery: [],
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

const LOCALES: VitrineLocale[] = ["fr", "en", "ar"];

describe("catalog CMS media in the public vitrine", () => {
  it("renders the real CMS PRIMARY image in the home rail media slot", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      HomePage({
        locale: "fr",
        dict,
        productImages: {
          PERSONAL_CARD: { src: "https://cdn.example/rail-primary.jpg", alt: "Carte rail" },
        },
      }),
    );
    expect(html).toContain("cdn.example%2Frail-primary.jpg");
    expect(html).toContain('alt="Carte rail"');
    // Same 4:3 card media box as before (no layout redesign, no CLS).
    expect(html).toContain("aspect-[4/3]");
    expect(html).toContain("object-cover");
  });

  it("keeps the neutral rail placeholder when the product has no CMS image", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(HomePage({ locale: "fr", dict }));
    expect(html).not.toContain("cdn.example");
    expect(html).not.toContain("/storage/v1/object/public");
    expect(html).toContain("aspect-[4/3]");
  });

  it("uses the same commercial media across FR / EN / AR", () => {
    const images = {
      PERSONAL_CARD: { src: "https://cdn.example/shared-rail.jpg", alt: null },
    };
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup(
        HomePage({ locale, dict: getDict(locale), productImages: images }),
      );
      expect(html).toContain("cdn.example%2Fshared-rail.jpg");
    }
  });

  it("shows the CMS PRIMARY first and preserves GALLERY order in the PDP gallery", () => {
    const dict = getDict("fr");
    const catalog: PublicCatalogProduct = {
      ...fixedCatalog(),
      galleryImages: [
        { url: "https://cdn.example/primary.jpg", alt: "Vue principale" },
        { url: "https://cdn.example/gallery-1.jpg", alt: "Vue 1" },
        { url: "https://cdn.example/gallery-2.jpg", alt: "Vue 2" },
      ],
    };
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog }),
    );
    const primaryAt = html.indexOf("primary.jpg");
    const firstThumbAt = html.indexOf("gallery-1.jpg");
    const secondThumbAt = html.indexOf("gallery-2.jpg");
    expect(primaryAt).toBeGreaterThanOrEqual(0);
    expect(firstThumbAt).toBeGreaterThan(primaryAt);
    expect(secondThumbAt).toBeGreaterThan(firstThumbAt);
    expect(html).toContain("aspect-[4/3]");
  });

  it("keeps the honest empty state when the CMS has no gallery image", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: { ...fixedCatalog(), primaryImageUrl: null, galleryImages: [] },
      }),
    );
    expect(html).toContain(dict.productPage.galleryEmpty);
    expect(html).not.toContain("cdn.example");
  });

  it("implements the same gallery behavior in every locale", () => {
    const catalog: PublicCatalogProduct = {
      ...fixedCatalog(),
      galleryImages: [
        { url: "https://cdn.example/primary.jpg", alt: "Vue principale" },
        { url: "https://cdn.example/gallery-1.jpg", alt: "Vue 1" },
        { url: "https://cdn.example/gallery-2.jpg", alt: "Vue 2" },
      ],
    };
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup(
        ProductLandingPage({ locale, dict: getDict(locale), slug: "personal-card", catalog }),
      );
      expect(html.indexOf("gallery-1.jpg")).toBeGreaterThan(html.indexOf("primary.jpg"));
      expect(html.indexOf("gallery-2.jpg")).toBeGreaterThan(html.indexOf("gallery-1.jpg"));
    }
  });

  it("has no hard-coded product image map or external image URL in the public vitrine", () => {
    const files = [
      "HomePage.tsx",
      "ProductRail.tsx",
      "product/landing.tsx",
      "product/gallery.tsx",
      "marketing/ProductCategory.tsx",
    ];
    const directImageUrl = /https?:\/\/[^\s"'`<>]+\.(?:avif|webp|jpe?g|png)/i;
    const staticProductImage =
      /(?:PERSONAL_CARD|CAREER_CARD|BUSINESS_CARD|GOOGLE_REVIEW_CARD|WHATSAPP_CARD|INSTAGRAM_CARD|CONTACT_CARD|CUSTOM_LINK_CARD)\s*:\s*["'`]/;
    for (const file of files) {
      const source = readFileSync(
        path.resolve(process.cwd(), "src/features/vitrine", file),
        "utf8",
      );
      expect(source, file).not.toMatch(directImageUrl);
      expect(source, file).not.toContain("drive.google.com");
      expect(source, file).not.toContain("/storage/v1/object/public");
      expect(source, file).not.toMatch(staticProductImage);
    }
  });
});
