import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
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
