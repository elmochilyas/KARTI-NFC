import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  catalogAvailabilityToSchema,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  productJsonLd,
} from "./seo";

describe("page metadata", () => {
  it("emits self-canonical plus full hreflang with French x-default", () => {
    const meta = pageMetadata({
      locale: "ar",
      title: "T",
      description: "D",
      segments: ["pricing"],
    });
    expect(meta.alternates?.canonical).toBe("http://localhost:3000/ar/pricing");
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages.fr).toBe("http://localhost:3000/fr/pricing");
    expect(languages.ar).toBe("http://localhost:3000/ar/pricing");
    expect(languages.en).toBe("http://localhost:3000/en/pricing");
    expect(languages["x-default"]).toBe("http://localhost:3000/fr/pricing");
  });

  it("never cross-canonicalizes locales", () => {
    const fr = pageMetadata({ locale: "fr", title: "T", description: "D", segments: [] });
    const en = pageMetadata({ locale: "en", title: "T", description: "D", segments: [] });
    expect(fr.alternates?.canonical).not.toBe(en.alternates?.canonical);
  });

  it("honors noindex directives for order-style pages", () => {
    const meta = pageMetadata({
      locale: "fr",
      title: "T",
      description: "D",
      segments: ["order"],
      index: false,
      follow: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("includes Open Graph basics", () => {
    const meta = pageMetadata({ locale: "fr", title: "T", description: "D", segments: [] });
    expect(meta.openGraph?.title).toBe("T");
    expect(meta.openGraph?.url).toContain("/fr");
  });
});

describe("structured data", () => {
  it("builds a valid Organization block", () => {
    const data = organizationJsonLd("https://karti.app", "Karti", "Desc");
    expect(data["@type"]).toBe("Organization");
    expect(data.url).toBe("https://karti.app/fr");
  });

  it("never fabricates Offer prices on products", () => {
    const data = productJsonLd({ name: "N", description: "D", url: "https://karti.app/fr/x" });
    expect(data["@type"]).toBe("Product");
    expect(JSON.stringify(data)).not.toContain("Offer");
    expect(JSON.stringify(data)).not.toContain("price");
  });

  it("emits Product + Offer only with a real configured price", () => {
    const data = productJsonLd({
      name: "Personal Card",
      description: "Share your contact in one tap.",
      url: "https://karti.pro/fr/products/personal-card",
      image: ["https://cdn.example/personal.jpg"],
      brand: "Karti",
      offer: {
        url: "https://karti.pro/fr/products/personal-card",
        price: "199.00",
        priceCurrency: "MAD",
      },
    }) as Record<string, unknown>;
    expect(data["@type"]).toBe("Product");
    const offers = data.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe("199.00");
    expect(offers.priceCurrency).toBe("MAD");
    expect(offers.url).toBe("https://karti.pro/fr/products/personal-card");
    expect(data.image).toEqual(["https://cdn.example/personal.jpg"]);
    const brand = data.brand as Record<string, unknown>;
    expect(brand.name).toBe("Karti");
    // Never fabricated: no reviews, no ratings.
    expect(JSON.stringify(data)).not.toContain("review");
    expect(JSON.stringify(data)).not.toContain("aggregateRating");
  });

  it("maps only real configured availability states", () => {
    expect(catalogAvailabilityToSchema("IN_STOCK")).toBe("https://schema.org/InStock");
    expect(catalogAvailabilityToSchema("OUT_OF_STOCK")).toBe("https://schema.org/OutOfStock");
    expect(catalogAvailabilityToSchema("PREORDER")).toBe("https://schema.org/PreOrder");
    expect(catalogAvailabilityToSchema(null)).toBeUndefined();
  });

  it("carries CMS OG images into metadata when provided", () => {
    const meta = pageMetadata({
      locale: "fr",
      title: "T",
      description: "D",
      segments: ["products", "personal-card"],
      images: ["https://cdn.example/og.jpg"],
    });
    expect(meta.openGraph?.images).toEqual(["https://cdn.example/og.jpg"]);
  });

  it("builds ordered breadcrumbs", () => {
    const data = breadcrumbJsonLd([
      { label: "Home", url: "https://karti.app/fr" },
      { label: "Pricing", url: "https://karti.app/fr/pricing" },
    ]);
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0].position).toBe(1);
  });

  it("builds FAQ and Article blocks matching visible content", () => {
    const faq = faqJsonLd([{ q: "Q?", a: "A." }]);
    expect(faq["@type"]).toBe("FAQPage");
    const article = articleJsonLd({ title: "T", description: "D", url: "https://karti.app/fr/u" });
    expect(article["@type"]).toBe("Article");
  });
});
