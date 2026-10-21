import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import { getPublishedCatalogProduct } from "./public";

const ORIGIN = "https://project.supabase.co";
const PUBLIC_PREFIX = `${ORIGIN}/storage/v1/object/public/catalog-assets/`;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

type ProductRow = {
  published: boolean;
  price_minor: number | null;
  currency: string;
  availability: string | null;
  primary_image_path: string | null;
  og_image_path: string | null;
};

type MediaRow = {
  storage_path: string;
  media_role: string;
  sort_order: number;
  alt_fr: string | null;
  alt_en: string | null;
  alt_ar: string | null;
};

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    published: true,
    price_minor: 19900,
    currency: "MAD",
    availability: "IN_STOCK",
    primary_image_path: "catalog/PERSONAL_CARD/primary/aaaaaaaaaaaaaaaa.webp",
    og_image_path: null,
    ...overrides,
  };
}

function mediaRow(overrides: Partial<MediaRow>): MediaRow {
  return {
    storage_path: "catalog/PERSONAL_CARD/gallery/bbbbbbbbbbbbbbbb.webp",
    media_role: "GALLERY",
    sort_order: 0,
    alt_fr: null,
    alt_en: null,
    alt_ar: null,
    ...overrides,
  };
}

/**
 * Minimal chainable Supabase double for exactly the three reads
 * `getPublishedCatalogProduct` performs. Media rows are returned in the
 * order the real query would (`order("sort_order")`).
 */
function fakeSupabase(data: {
  product: ProductRow | null;
  localization?: Record<string, unknown> | null;
  media?: MediaRow[];
}) {
  const mediaResult = { data: data.media ?? [], error: null };
  function table(name: string) {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => (name === "catalog_product_media" ? Promise.resolve(mediaResult) : chain);
    chain.maybeSingle = async () => ({
      data:
        name === "catalog_products"
          ? data.product
          : name === "catalog_product_localizations"
            ? (data.localization ?? null)
            : null,
      error: null,
    });
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(
        name === "catalog_product_media" ? mediaResult : { data: null, error: null },
      ).then(resolve);
    return chain;
  }
  return { from: (name: string) => table(name) } as never;
}

function load(
  locale: VitrineLocale,
  data: Parameters<typeof fakeSupabase>[0],
): ReturnType<typeof getPublishedCatalogProduct> {
  return getPublishedCatalogProduct("PERSONAL_CARD", locale, fakeSupabase(data));
}

describe("public catalog media resolution", () => {
  it("resolves the CMS primary pointer through the catalog-assets storage path", async () => {
    const catalog = await load("fr", { product: productRow() });
    expect(catalog?.primaryImageUrl).toBe(
      `${PUBLIC_PREFIX}catalog/PERSONAL_CARD/primary/aaaaaaaaaaaaaaaa.webp`,
    );
  });

  it("heals a missing primary pointer from the CMS PRIMARY media row", async () => {
    const catalog = await load("fr", {
      product: productRow({ primary_image_path: null }),
      media: [
        mediaRow({
          media_role: "PRIMARY",
          storage_path: "catalog/PERSONAL_CARD/primary/cccccccccccccccc.webp",
        }),
      ],
    });
    expect(catalog?.primaryImageUrl).toBe(
      `${PUBLIC_PREFIX}catalog/PERSONAL_CARD/primary/cccccccccccccccc.webp`,
    );
  });

  it("keeps GALLERY images in catalog sort_order and excludes the primary", async () => {
    const catalog = await load("fr", {
      product: productRow(),
      media: [
        mediaRow({
          media_role: "GALLERY",
          sort_order: 0,
          storage_path: "catalog/PERSONAL_CARD/gallery/1111111111111111.webp",
        }),
        mediaRow({
          media_role: "GALLERY",
          sort_order: 1,
          storage_path: "catalog/PERSONAL_CARD/gallery/2222222222222222.webp",
        }),
        mediaRow({
          media_role: "GALLERY",
          sort_order: 2,
          storage_path: "catalog/PERSONAL_CARD/primary/aaaaaaaaaaaaaaaa.webp",
        }),
      ],
    });
    expect(catalog?.gallery.map((image) => image.url)).toEqual([
      `${PUBLIC_PREFIX}catalog/PERSONAL_CARD/gallery/1111111111111111.webp`,
      `${PUBLIC_PREFIX}catalog/PERSONAL_CARD/gallery/2222222222222222.webp`,
    ]);
  });

  it("caps the public gallery at the first six extra images", async () => {
    const media = Array.from({ length: 8 }, (_, index) =>
      mediaRow({
        sort_order: index,
        storage_path: `catalog/PERSONAL_CARD/gallery/${String(index).padStart(16, "0")}.webp`,
      }),
    );
    const catalog = await load("fr", { product: productRow(), media });
    expect(catalog?.gallery).toHaveLength(6);
    expect(catalog?.gallery[0]?.url).toContain("0000000000000000.webp");
    expect(catalog?.gallery[5]?.url).toContain("0000000000000005.webp");
  });

  it("uses the first CARD_PREVIEW row as the compact-slot fallback", async () => {
    const catalog = await load("fr", {
      product: productRow({ primary_image_path: null }),
      media: [
        mediaRow({
          media_role: "CARD_PREVIEW",
          sort_order: 0,
          storage_path: "catalog/PERSONAL_CARD/card-preview/dddddddddddddddd.webp",
          alt_fr: "Aperçu carte",
        }),
        mediaRow({
          media_role: "CARD_PREVIEW",
          sort_order: 1,
          storage_path: "catalog/PERSONAL_CARD/card-preview/eeeeeeeeeeeeeeee.webp",
        }),
      ],
    });
    expect(catalog?.primaryImageUrl).toBeNull();
    expect(catalog?.cardPreviewImage).toEqual({
      url: `${PUBLIC_PREFIX}catalog/PERSONAL_CARD/card-preview/dddddddddddddddd.webp`,
      alt: "Aperçu carte",
    });
  });

  it("localizes media alt per locale, falling back fr → en → ar", async () => {
    const media = [
      mediaRow({
        media_role: "GALLERY",
        alt_fr: "Carte en français",
        alt_en: "Card in English",
        alt_ar: "بطاقة",
      }),
      mediaRow({
        media_role: "GALLERY",
        sort_order: 1,
        storage_path: "catalog/PERSONAL_CARD/gallery/ffffffffffffffff.webp",
        alt_fr: "Repli français",
      }),
      mediaRow({
        media_role: "GALLERY",
        sort_order: 2,
        storage_path: "catalog/PERSONAL_CARD/gallery/9999999999999999.webp",
      }),
    ];
    const fr = await load("fr", { product: productRow(), media });
    const en = await load("en", { product: productRow(), media });
    const ar = await load("ar", { product: productRow(), media });
    expect(fr?.gallery.map((image) => image.alt)).toEqual([
      "Carte en français",
      "Repli français",
      null,
    ]);
    expect(en?.gallery.map((image) => image.alt)).toEqual([
      "Card in English",
      "Repli français",
      null,
    ]);
    expect(ar?.gallery.map((image) => image.alt)).toEqual(["بطاقة", "Repli français", null]);
    // Commercial media are locale-independent: same URLs in every locale.
    expect(en?.gallery.map((image) => image.url)).toEqual(fr?.gallery.map((image) => image.url));
    expect(ar?.gallery.map((image) => image.url)).toEqual(fr?.gallery.map((image) => image.url));
  });

  it("keeps the placeholder state when the CMS has no product media", async () => {
    const catalog = await load("fr", {
      product: productRow({ primary_image_path: null }),
      media: [],
    });
    expect(catalog?.primaryImageUrl).toBeNull();
    expect(catalog?.primaryImageAlt).toBeNull();
    expect(catalog?.cardPreviewImage).toBeNull();
    expect(catalog?.gallery).toEqual([]);
    expect(catalog?.ogImageUrl).toBeNull();
  });

  it("never exposes media for an unpublished product", async () => {
    const catalog = await load("fr", {
      product: productRow({ published: false }),
      media: [mediaRow({ media_role: "PRIMARY" })],
    });
    expect(catalog).toBeNull();
  });
});
