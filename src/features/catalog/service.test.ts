import { describe, expect, it } from "vitest";
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
function quoteProductRow(productType: string): Record<string, unknown> {
  return {
    product_type: productType,
    published: true,
    pricing_mode: "QUOTE",
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

  it("loads QUOTE + null price + no image + empty media without crashing", async () => {
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: quoteProductRow("CUSTOM_LINK_CARD") },
      locRows,
      mediaRows: [],
    });
    const res = await getCatalogAdminProduct(db, "CUSTOM_LINK_CARD");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.pricing_mode).toBe("QUOTE");
    expect(res.data.price_minor).toBeNull();
    expect(res.data.primary_image_path).toBeNull();
    expect(res.data.og_image_path).toBeNull();
    expect(res.data.media).toEqual([]);
    expect(res.data.localizations).toHaveLength(3);
  });

  it("treats missing localization rows as valid empty state", async () => {
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: quoteProductRow("CUSTOM_LINK_CARD") },
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
      productRows: { CUSTOM_LINK_CARD: quoteProductRow("CUSTOM_LINK_CARD") },
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
    expect(res.data.localizations[0].faqs).toEqual([{ q: "Actual question?", a: "Actual answer." }]);
  });

  it("fails safely (NOT_FOUND) for unknown pricing mode or product type in the row", async () => {
    const badMode = adminFakeDb({
      productRows: {
        CUSTOM_LINK_CARD: { ...quoteProductRow("CUSTOM_LINK_CARD"), pricing_mode: "YEARLY" },
      },
      locRows: [],
      mediaRows: [],
    });
    await expect(getCatalogAdminProduct(badMode, "CUSTOM_LINK_CARD")).resolves.toMatchObject({
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
  const base = quoteProductRow("CUSTOM_LINK_CARD");

  it("maps FIXED + MAD decimal to integer minor units on save", async () => {
    const captured: { update?: unknown } = {};
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: base },
      captured,
      updatedProductRow: { ...base, pricing_mode: "FIXED", price_minor: 19950 },
    });
    const res = await updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
      published: true,
      pricingMode: "FIXED",
      priceMad: "199.50",
      availability: null,
    });
    expect(res.ok).toBe(true);
    expect(captured.update).toMatchObject({ pricing_mode: "FIXED", price_minor: 19950 });
    if (res.ok) expect(res.data.price_minor).toBe(19950);
  });

  it("clears the price when switching back to QUOTE", async () => {
    const captured: { update?: unknown } = {};
    const db = adminFakeDb({
      productRows: { CUSTOM_LINK_CARD: { ...base, pricing_mode: "FIXED", price_minor: 19950 } },
      captured,
      updatedProductRow: { ...base, pricing_mode: "QUOTE", price_minor: null },
    });
    const res = await updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
      published: true,
      pricingMode: "QUOTE",
      priceMad: null,
      availability: null,
    });
    expect(res.ok).toBe(true);
    expect(captured.update).toMatchObject({ pricing_mode: "QUOTE", price_minor: null });
  });

  it("rejects FIXED without a price and QUOTE carrying a price", async () => {
    const db = adminFakeDb({ productRows: { CUSTOM_LINK_CARD: base } });
    await expect(
      updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
        published: true,
        pricingMode: "FIXED",
        priceMad: null,
        availability: null,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    await expect(
      updateCatalogProduct(db, "CUSTOM_LINK_CARD", {
        published: true,
        pricingMode: "QUOTE",
        priceMad: "199.50",
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
    expect(captured.upsert).toMatchObject({ display_name: "Lien Custom", seo_title: "Custom Link — Karti" });
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
        pricingMode: "QUOTE",
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
