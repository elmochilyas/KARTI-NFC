import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { getDict } from "@/features/vitrine/i18n";
import type { PublicCatalogProduct } from "@/features/catalog/public";
import { getPublishedCatalogProduct } from "@/features/catalog/public";
import { StickyCta } from "@/features/vitrine/marketing/StickyCta";
import { ProductLandingPage } from "@/features/vitrine/product/landing";
import { relatedFor, type RelatedCard } from "@/features/vitrine/product/related";

function fixedCatalog(overrides?: Partial<PublicCatalogProduct>): PublicCatalogProduct {
  return {
    productType: "PERSONAL_CARD",
    published: true,
    priceMinor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primaryImageUrl: "https://cdn.example/primary.jpg",
    ogImageUrl: null,
    galleryImages: [
      { url: "https://cdn.example/primary.jpg", alt: "" },
      { url: "https://cdn.example/gallery-2.jpg", alt: "Vue latérale" },
    ],
    displayName: "Carte Personnelle",
    shortName: null,
    heroTitle: "Titre héros",
    heroDescription: "Description complète du produit.",
    shortDescription: "Pitch court.",
    outcomeText: null,
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

describe("PDP landing page", () => {
  it("renders the CMS title, short pitch, description, price, and stock badge", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("<h1");
    expect(html).toContain("Titre héros");
    expect(html).toContain("Pitch court.");
    expect(html).toContain("Description complète du produit.");
    expect(html).toContain("199.00 MAD");
    expect(html).toContain(dict.productPage.availabilityInStock);
    expect(html).not.toContain("undefined");
  });

  it("renders the gallery from CMS images through the Next.js image pipeline", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("/_next/image");
    expect(html).toContain("cdn.example%2Fprimary.jpg");
    expect(html).toContain("cdn.example%2Fgallery-2.jpg");
    // Empty alt falls back to the product name (never an empty alt on content images).
    expect(html).toContain('alt="Carte Personnelle"');
  });

  it("shows an honest empty gallery when the operator uploaded no photos", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: fixedCatalog({ galleryImages: [] }),
      }),
    );
    expect(html).toContain(dict.productPage.galleryEmpty);
    expect(html).not.toContain("undefined");
  });

  it("withholds only the buy-panel CTA while unpriced", () => {
    const dict = getDict("fr");
    const priced = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    const unpriced = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: fixedCatalog({ priceMinor: null }),
      }),
    );
    expect(unpriced).toContain(dict.order.pricePending);
    expect(unpriced).not.toContain("199.00 MAD");
    // Buy panel: buy CTA, page examples link, final CTA. Unpriced drops
    // exactly the buy-panel CTA (page-level discovery links stay, as before).
    const count = (html: string): number =>
      html.split("/fr/order?product=personal-card").length - 1;
    expect(count(priced)).toBe(3);
    expect(count(unpriced)).toBe(2);
  });

  it("links the buy-panel CTA into the order flow with the product preselected", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("/fr/order?product=personal-card");
  });

  it("shows photo cards with configured prices and CMS names", () => {
    const dict = getDict("fr");
    const relatedCards: RelatedCard[] = [
      {
        product: "CONTACT_CARD",
        name: null,
        priceLine: "149.00 MAD",
        imageUrl: "https://cdn.example/contact.jpg",
        imageAlt: "Carte Contact",
      },
      {
        product: "BUSINESS_CARD",
        name: "Business CMS",
        priceLine: null,
        imageUrl: null,
        imageAlt: "",
      },
    ];
    const html = renderToStaticMarkup(
      ProductLandingPage({
        locale: "fr",
        dict,
        slug: "personal-card",
        catalog: fixedCatalog(),
        relatedCards,
      }),
    );
    expect(html).not.toContain("/fr/products/career-card");
    expect(html).toContain("/fr/products/contact-card");
    expect(html).toContain("149.00 MAD");
    expect(html).toContain("Business CMS");
    // Photo through the Next.js image pipeline; missing photo falls back
    // to an initial tile (never a broken image).
    expect(html).toContain("cdn.example%2Fcontact.jpg");
    expect(html).toContain('alt="Carte Contact"');
    expect(html).toContain(">B<");
  });

  it("renders identically in RTL without breaking layout markers", () => {
    const dict = getDict("ar");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "ar", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("199.00 MAD");
    expect(html).toContain("karti-flip-rtl");
    expect(html).not.toContain("undefined");
  });

  it("notFounds unknown slugs", () => {
    const dict = getDict("fr");
    expect(() => ProductLandingPage({ locale: "fr", dict, slug: "nope" })).toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("PDP mobile polish", () => {
  function findSticky(element: unknown): Record<string, unknown> {
    const stack: unknown[] = [element];
    while (stack.length > 0) {
      const node = stack.pop() as {
        type?: unknown;
        props?: Record<string, unknown> & { children?: unknown };
      } | null;
      if (!node || typeof node !== "object") continue;
      if (node.type === StickyCta && node.props) return node.props;
      const children = node.props?.children;
      if (Array.isArray(children)) stack.push(...children);
      else if (children !== undefined && children !== null) stack.push(children);
    }
    throw new Error("StickyCta not found in landing output");
  }

  it("passes the compact mobile action + price meta to the sticky bar", () => {
    const dict = getDict("fr");
    const element = ProductLandingPage({
      locale: "fr",
      dict,
      slug: "personal-card",
      catalog: fixedCatalog(),
    });
    expect(findSticky(element)).toMatchObject({
      action: dict.productPage.orderCta,
      shortAction: dict.nav.orderCtaShort,
      meta: "199.00 MAD",
    });
  });

  it("centers the tap mark on stacked mobile and keeps the H1 unbreakable", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("justify-self-center");
    expect(html).toContain("break-words");
  });

  it("gives the thumbnail strip edge-bleed snap scrolling", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("snap-x");
    expect(html).toContain("snap-start");
  });
});

describe("related products map", () => {
  it("returns 3 related products, never self", () => {
    for (const product of Object.keys(ALL_PUBLISHED) as (keyof typeof ALL_PUBLISHED)[]) {
      const related = relatedFor(product);
      expect(related).toHaveLength(3);
      expect(related).not.toContain(product);
    }
  });

  it("filters unpublished products", () => {
    const related = relatedFor("PERSONAL_CARD", { ...ALL_PUBLISHED, CAREER_CARD: false });
    expect(related).not.toContain("CAREER_CARD");
    expect(related).toHaveLength(2);
  });
});

describe("public catalog gallery projection", () => {
  function stubDb(opts: { product: unknown; loc: unknown; media: unknown }) {
    const once = (data: unknown) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => chain;
      chain.order = () => chain;
      chain.maybeSingle = async () => ({ error: null, data });
      chain.error = null;
      chain.data = data;
      return chain;
    };
    return {
      from: (table: string) => {
        if (table === "catalog_products") return once(opts.product);
        if (table === "catalog_product_localizations") return once(opts.loc);
        return once(opts.media);
      },
    };
  }

  const productRow = {
    published: true,
    price_minor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primary_image_path: "catalog/PERSONAL_CARD/primary/aaaaaaaaaaaaaaaa.webp",
    og_image_path: null,
  };

  it("orders the primary image first, then gallery rows, with locale alt fallback", async () => {
    const db = stubDb({
      product: productRow,
      loc: null,
      media: [
        {
          storage_path: "catalog/PERSONAL_CARD/gallery/bbbbbbbbbbbbbbbb.webp",
          media_role: "GALLERY",
          sort_order: 0,
          alt_fr: null,
          alt_en: "Side view",
          alt_ar: null,
        },
        {
          storage_path: "catalog/PERSONAL_CARD/primary/aaaaaaaaaaaaaaaa.webp",
          media_role: "PRIMARY",
          sort_order: 5,
          alt_fr: "Vue de face",
          alt_en: "Front view",
          alt_ar: null,
        },
      ],
    });
    const row = await getPublishedCatalogProduct("PERSONAL_CARD", "fr", db as never);
    expect(row?.galleryImages).toHaveLength(2);
    expect(row?.galleryImages[0].url).toContain("primary/aaaaaaaaaaaaaaaa.webp");
    expect(row?.galleryImages[0].alt).toBe("Vue de face");
    // fr alt missing → falls back to the English alt.
    expect(row?.galleryImages[1].alt).toBe("Side view");
  });

  it("keeps the product readable when the media query fails", async () => {
    const db = {
      from: (table: string) => {
        if (table === "catalog_product_media") throw new Error("db down");
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.in = () => chain;
        chain.order = () => chain;
        chain.maybeSingle = async () => ({
          error: null,
          data: table === "catalog_products" ? productRow : null,
        });
        chain.error = null;
        chain.data = table === "catalog_products" ? productRow : null;
        return chain;
      },
    };
    const row = await getPublishedCatalogProduct("PERSONAL_CARD", "fr", db as never);
    expect(row?.priceMinor).toBe(19900);
    expect(row?.galleryImages).toEqual([]);
  });
});

describe("PDP information visuals", () => {
  it("renders the tap moment as a dark signature panel with a light tile", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("karti-card-sheen");
    expect(html).toContain("bg-ink");
    expect(html).toContain("text-white");
    expect(html).toContain("justify-self-center");
  });

  it("sets the problem panel in gold to alternate with the dark tap panel", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("bg-gold-soft");
  });

  it("renders the how-it-works flow as step cards, not plain lines", () => {
    const dict = getDict("fr");
    const html = renderToStaticMarkup(
      ProductLandingPage({ locale: "fr", dict, slug: "personal-card", catalog: fixedCatalog() }),
    );
    expect(html).toContain("sm:grid-cols-3");
  });
});
