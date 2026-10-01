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
