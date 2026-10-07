import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sharp from "sharp";
import {
  deleteCatalogMedia,
  getCatalogAdminProduct,
  listCatalogAdmin,
  reorderCatalogMedia,
  setCatalogPrimaryImage,
  updateCatalogMediaAlt,
  updateCatalogProduct,
  uploadCatalogImage,
  upsertCatalogLocalization,
} from "./service";
import type { CatalogDb } from "./types";

/**
 * Authorization boundary: every catalog mutation re-verifies the session
 * server-side and refuses before touching the database. RLS
 * (`private.is_admin()`) is the authoritative layer; these tests pin the
 * app-level gate with a session-less fake (no `.from` chain needed because
 * the fake never gets past `requireAdmin`).
 */
function signedOutDb(): CatalogDb {
  return {
    auth: {
      getClaims: async () => {
        throw new Error("no session");
      },
    },
  } as unknown as CatalogDb;
}

/**
 * Minimal in-memory Supabase stub shaped like the production catalog tables.
 * Supports exactly the query chains used by the catalog service:
 * select/eq/order/limit + maybeSingle, update/eq/select + maybeSingle,
 * upsert/select + maybeSingle. Anything else is out of scope.
 */
function unpricedProductRow(productType: string): Record<string, unknown> {
  return {
    product_type: productType,
    published: true,
    price_minor: null,
    currency: "MAD",
    availability: null,
    primary_image_path: null,
    og_image_path: null,
    created_at: "2026-10-01T14:42:57.273Z",
    updated_at: "2026-10-01T14:42:57.273Z",
  };
}

function emptyLocRow(productType: string, locale: string): Record<string, unknown> {
  return {
    product_type: productType,
    locale,
    display_name: null,
    short_name: null,
    hero_title: null,
    hero_description: null,
    short_description: null,
    outcome_text: null,
    pricing_note: null,
    seo_title: null,
    seo_description: null,
    audiences: [],
    benefits: [],
    use_cases: [],
    included: [],
    faqs: [],
    updated_at: "2026-10-01T14:42:57.273Z",
  };
}

function adminFakeDb(options: {
  productRows?: Record<string, Record<string, unknown>>;
  locRows?: Record<string, unknown>[];
  mediaRows?: Record<string, unknown>[];
  updatedProductRow?: Record<string, unknown> | null;
  upsertedLocRow?: Record<string, unknown> | null;
  captured?: { update?: unknown; upsert?: unknown };
}): CatalogDb {
  const chainFor = (table: string, mode: "select" | "update" | "upsert") => {
    const filters: Array<[string, unknown]> = [];
    const matches = (row: Record<string, unknown>) =>
      filters.every(([col, value]) => row[col] === value);
    const resolveAll = (): unknown[] => {
      if (table === "catalog_products") {
        if (mode === "update") return options.updatedProductRow ? [options.updatedProductRow] : [];
        return Object.values(options.productRows ?? {}).filter((row) =>
          matches(row as Record<string, unknown>),
        );
      }
      if (table === "catalog_product_localizations") {
        if (mode === "upsert") return options.upsertedLocRow ? [options.upsertedLocRow] : [];
        return (options.locRows ?? []).filter((row) => matches(row as Record<string, unknown>));
      }
      return (options.mediaRows ?? []).filter((row) => matches(row as Record<string, unknown>));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      eq: (col: string, value: unknown) => {
        filters.push([col, value]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      select: () => chain,
      maybeSingle: async () => ({ data: resolveAll()[0] ?? null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => void) =>
        resolve({ data: resolveAll(), error: null }),
    };
    return chain;
  };
  return {
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "test-admin" } }, error: null }),
    },
    from: (table: string) => ({
      select: () => chainFor(table, "select"),
      update: (payload: unknown) => {
        if (options.captured) options.captured.update = payload;
        return chainFor(table, "update");
      },
      upsert: (payload: unknown) => {
        if (options.captured) options.captured.upsert = payload;
        return chainFor(table, "upsert");
      },
    }),
  } as unknown as CatalogDb;
}

describe("catalog empty/initial CMS state", () => {
  const locRows = ["fr", "en", "ar"].map((locale) => emptyLocRow("CUSTOM_LINK_CARD", locale));

  it("loads unpriced + no image + empty media without crashing", async () => {
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: unpricedProductRow("CUSTOM_LINK_CARD") },
      locRows,
      mediaRows: [],
    });
    const res = await getCatalogAdminProduct(db, "CUSTOM_LINK_CARD");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.price_minor).toBeNull();
    expect(res.data.primary_image_path).toBeNull();
    expect(res.data.og_image_path).toBeNull();
    expect(res.data.media).toEqual([]);
    expect(res.data.localizations).toHaveLength(3);
  });

  it("treats missing localization rows as valid empty state", async () => {
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: unpricedProductRow("CUSTOM_LINK_CARD") },
      locRows: [],
      mediaRows: [],
    });
    const res = await getCatalogAdminProduct(db, "CUSTOM_LINK_CARD");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.localizations).toEqual([]);
  });

  it("sanitizes malformed JSON content instead of crashing", async () => {
    const malformed = {
      ...emptyLocRow("CUSTOM_LINK_CARD", "fr"),
      audiences: "not-an-array",
      benefits: null,
      use_cases: { unexpected: "object" },
      faqs: [{ q: " Actual question? ", a: " Actual answer. " }, "junk", { q: "", a: "" }],
    };
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: unpricedProductRow("CUSTOM_LINK_CARD") },
      locRows: [malformed],
      mediaRows: [],
    });
    const res = await getCatalogAdminProduct(db, "CUSTOM_LINK_CARD");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.localizations).toHaveLength(1);
    expect(res.data.localizations[0].audiences).toEqual([]);
    expect(res.data.localizations[0].benefits).toEqual([]);
    expect(res.data.localizations[0].use_cases).toEqual([]);
    expect(res.data.localizations[0].faqs).toEqual([
      { q: "Actual question?", a: "Actual answer." },
    ]);
  });

  it("fails safely (NOT_FOUND) for unknown product type in the row", async () => {
    const badType = adminFakeDb({
      productRows: {
        CUSTOM_LINK_CARD: { ...unpricedProductRow("CUSTOM_LINK_CARD"), product_type: "GOLD_CARD" },
      },
      locRows: [],
      mediaRows: [],
    });
    await expect(getCatalogAdminProduct(badType, "CUSTOM_LINK_CARD")).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const missing = adminFakeDb({ productRows: {}, locRows: [], mediaRows: [] });
    await expect(getCatalogAdminProduct(missing, "CUSTOM_LINK_CARD")).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("catalog price save/reload", () => {
  const base = unpricedProductRow("CUSTOM_LINK_CARD");

  it("maps a MAD decimal to integer minor units on save", async () => {
    const captured: { update?: unknown } = {};
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: base },
      captured,
      updatedProductRow: { ...base, price_minor: 19950 },
    });
    const res = await updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
      published: true,
      priceMad: "199.50",
      availability: null,
    });
    expect(res.ok).toBe(true);
    expect(captured.update).toMatchObject({ price_minor: 19950 });
    if (res.ok) expect(res.data.price_minor).toBe(19950);
  });

  it("clears the price back to Price-not-configured when emptied", async () => {
    const captured: { update?: unknown } = {};
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: { ...base, price_minor: 19950 } },
      captured,
      updatedProductRow: { ...base, price_minor: null },
    });
    const res = await updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
      published: true,
      priceMad: null,
      availability: null,
    });
    expect(res.ok).toBe(true);
    expect(captured.update).toMatchObject({ price_minor: null });
  });

  it("rejects invalid decimal prices", async () => {
    const db = adminFakeDb({ productRows: { CUSTOM_LINK_CARD: base } });
    await expect(
      updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
        published: true,
        priceMad: "12.345",
        availability: null,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    await expect(
      updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
        published: true,
        priceMad: "0",
        availability: null,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("upserts FR copy including SEO fields", async () => {
    const captured: { upsert?: unknown } = {};
    const row = { ...emptyLocRow("CUSTOM_LINK_CARD", "fr"), display_name: "Lien Custom" };
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: base },
      captured,
      upsertedLocRow: row,
    });
    const res = await upsertCatalogLocalization(db, {
      productType: "CUSTOM_LINK_CARD",
      locale: "fr",
      displayName: "Lien Custom",
      shortName: null,
      heroTitle: null,
      heroDescription: null,
      shortDescription: null,
      outcomeText: null,
      pricingNote: null,
      seoTitle: "Custom Link — Karti",
      seoDescription: "Desc",
      audiences: [],
      benefits: [],
      useCases: [],
      included: [],
      faqs: [],
    });
    expect(res.ok).toBe(true);
    expect(captured.upsert).toMatchObject({
      display_name: "Lien Custom",
      seo_title: "Custom Link — Karti",
    });
  });
});

describe("catalog authorization", () => {
  it("denies list/get/update/localization/media writes without a session", async () => {
    const db = signedOutDb();
    await expect(listCatalogAdmin(db)).resolves.toMatchObject({ ok: false });
    await expect(getCatalogAdminProduct(db, "PERSONAL_CARD")).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    await expect(
      updateCatalogProduct(db, "PERSONAL_CARD", {
        published: true,
        priceMad: null,
        availability: null,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      upsertCatalogLocalization(db, {
        productType: "PERSONAL_CARD",
        locale: "fr",
        displayName: "X",
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
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      uploadCatalogImage(db, {
        productType: "PERSONAL_CARD",
        role: "GALLERY",
        bytes: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      updateCatalogMediaAlt(db, {
        productType: "PERSONAL_CARD",
        mediaId: "123e4567-e89b-12d3-a456-426614174000",
        altFr: "X",
        altEn: null,
        altAr: null,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      setCatalogPrimaryImage(db, {
        productType: "PERSONAL_CARD",
        mediaId: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      reorderCatalogMedia(db, { productType: "PERSONAL_CARD", orderedIds: [] }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await expect(
      deleteCatalogMedia(db, {
        productType: "PERSONAL_CARD",
        mediaId: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});

describe("catalog image upload optimization", () => {
  /** Storage + insert stub capturing the stored bytes, path, and options. */
  function uploadFakeDb(captured: {
    path?: string;
    bytes?: Uint8Array;
    options?: Record<string, unknown>;
    removed?: string[];
    inserted?: Record<string, unknown>;
  }): CatalogDb {
    const mediaRow = (storagePath: string) => ({
      id: "123e4567-e89b-12d3-a456-426614174000",
      product_type: "CUSTOM_LINK_CARD",
      storage_path: storagePath,
      media_role: "PRIMARY",
      sort_order: 0,
      alt_fr: null,
      alt_en: null,
      alt_ar: null,
      created_at: "2026-10-08T00:00:00.000Z",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      select: () => chain,
      maybeSingle: async () => ({ data: mediaRow(captured.path ?? ""), error: null }),
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    };
    return {
      auth: {
        getClaims: async () => ({ data: { claims: { sub: "test-admin" } }, error: null }),
      },
      from: () => ({
        select: () => chain,
        update: () => chain,
        insert: (payload: unknown) => {
          captured.inserted = payload as Record<string, unknown>;
          return chain;
        },
      }),
      storage: {
        from: () => ({
          upload: async (path: string, bytes: Uint8Array, options: Record<string, unknown>) => {
            captured.path = path;
            captured.bytes = bytes;
            captured.options = options;
            return { data: { path }, error: null };
          },
          remove: async (paths: string[]) => {
            captured.removed = [...(captured.removed ?? []), ...paths];
            return { data: null, error: null };
          },
        }),
      },
    } as unknown as CatalogDb;
  }

  async function pngFixture(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: { width, height, channels: 3, background: { r: 30, g: 140, b: 90 } },
    })
      .png()
      .toBuffer();
  }

  it("stores an optimized WebP under a versioned path with a long cache header", async () => {
    const captured: Record<string, unknown> = {};
    const db = uploadFakeDb(captured as never);
    const res = await uploadCatalogImage(db, {
      productType: "CUSTOM_LINK_CARD",
      role: "PRIMARY",
      bytes: new Uint8Array(await pngFixture(1600, 900)),
      mimeType: "image/png",
    });
    expect(res.ok).toBe(true);
    // Versioned server-generated .webp path (never the raw filename).
    expect(captured.path).toMatch(/^catalog\/CUSTOM_LINK_CARD\/primary\/[0-9a-f]{16}\.webp$/);
    // Stored bytes are the optimized WebP, not the PNG original.
    const stored = Buffer.from(captured.bytes as Uint8Array);
    expect(stored.subarray(0, 4).toString()).toBe("RIFF");
    expect(stored.subarray(8, 12).toString()).toBe("WEBP");
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
    expect(captured.options).toMatchObject({
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    expect(captured.inserted).toMatchObject({
      product_type: "CUSTOM_LINK_CARD",
      storage_path: captured.path,
      media_role: "PRIMARY",
    });
  });

  it("rejects SVG without touching storage or the media table", async () => {
    const captured: Record<string, unknown> = {};
    const db = uploadFakeDb(captured as never);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const res = await uploadCatalogImage(db, {
      productType: "CUSTOM_LINK_CARD",
      role: "GALLERY",
      bytes: new Uint8Array(svg),
      mimeType: "image/svg+xml",
    });
    expect(res).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(captured.path).toBeUndefined();
    expect(captured.inserted).toBeUndefined();
  });

  it("rejects too-small images with a clear error and no partial state", async () => {
    const captured: Record<string, unknown> = {};
    const db = uploadFakeDb(captured as never);
    const res = await uploadCatalogImage(db, {
      productType: "CUSTOM_LINK_CARD",
      role: "GALLERY",
      bytes: new Uint8Array(await pngFixture(400, 300)),
      mimeType: "image/png",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message).toBe("Image is too small. Minimum: 800 × 600 px.");
    expect(captured.path).toBeUndefined();
    expect(captured.inserted).toBeUndefined();
  });

  it("rejects forged MIME payloads before processing", async () => {
    const captured: Record<string, unknown> = {};
    const db = uploadFakeDb(captured as never);
    const html = new TextEncoder().encode("<html><body>nope</body></html>");
    const res = await uploadCatalogImage(db, {
      productType: "CUSTOM_LINK_CARD",
      role: "GALLERY",
      bytes: new Uint8Array(html),
      mimeType: "image/png",
    });
    expect(res.ok).toBe(false);
    expect(captured.path).toBeUndefined();
  });
});
