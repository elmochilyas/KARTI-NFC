import { describe, expect, it } from "vitest";
import { catalogAssetPath, CATALOG_ASSETS_BUCKET, isManagedCatalogPath } from "./storagePaths";

describe("catalog storage paths", () => {
  it("uses a dedicated public bucket (never customer profile assets)", () => {
    expect(CATALOG_ASSETS_BUCKET).toBe("catalog-assets");
    expect(CATALOG_ASSETS_BUCKET).not.toBe("profile-assets");
  });

  it("generates server-shaped paths with random names", () => {
    const first = catalogAssetPath("PERSONAL_CARD", "PRIMARY", "webp");
    const second = catalogAssetPath("PERSONAL_CARD", "PRIMARY", "webp");
    expect(first).toMatch(/^catalog\/PERSONAL_CARD\/primary\/[0-9a-f]{16}\.webp$/);
    expect(first).not.toBe(second);
    expect(catalogAssetPath("WHATSAPP_CARD", "GALLERY", "jpg")).toMatch(
      /^catalog\/WHATSAPP_CARD\/gallery\/[0-9a-f]{16}\.jpg$/,
    );
  });

  it("gates deletes to managed catalog paths only", () => {
    expect(isManagedCatalogPath("catalog/PERSONAL_CARD/primary/abcdef0123456789.webp")).toBe(true);
    expect(isManagedCatalogPath("profiles/abc/avatar/abcdef0123456789.webp")).toBe(false);
    expect(isManagedCatalogPath("catalog/PERSONAL_CARD/primary/evil.svg")).toBe(false);
    expect(isManagedCatalogPath("catalog/../../etc/passwd")).toBe(false);
    expect(isManagedCatalogPath("")).toBe(false);
  });
});
