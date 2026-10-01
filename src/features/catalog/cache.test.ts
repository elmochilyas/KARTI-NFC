import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { updateTag, unstableCacheImpl } = vi.hoisted(() => {
  return {
    updateTag: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unstableCacheImpl: vi.fn((fn: (...args: any[]) => unknown) => fn),
  };
});

vi.mock("next/cache", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTag: (...args: any[]) => updateTag(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (...args: any[]) => (unstableCacheImpl as (...a: any[]) => unknown)(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("./public", () => ({
  getPublishedCatalogProduct: vi.fn(),
  getPublishedFlags: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedCatalogProduct, getPublishedFlags } from "./public";
import { CATALOG_TAG, getCachedCatalogProduct, revalidateCatalog } from "./cache";

describe("catalog cache (zero-stale, purge-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes one global tag for all products and locales", () => {
    expect(CATALOG_TAG).toBe("catalog-products");
  });

  it("loads the published projection through the privileged client", async () => {
    const db = { from: vi.fn() };
    vi.mocked(createAdminClient).mockReturnValue(db as never);
    vi.mocked(getPublishedCatalogProduct).mockResolvedValue("row" as never);
    await expect(getCachedCatalogProduct("PERSONAL_CARD", "fr")).resolves.toBe("row");
    expect(getPublishedCatalogProduct).toHaveBeenCalledWith("PERSONAL_CARD", "fr", db);
  });

  it("falls back safely when the server client is unconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("not configured");
    });
    await expect(getCachedCatalogProduct("PERSONAL_CARD", "fr")).resolves.toBeNull();
    expect(getPublishedCatalogProduct).not.toHaveBeenCalled();
    expect(getPublishedFlags).not.toHaveBeenCalled();
  });

  it("purges immediately via updateTag on catalog writes", () => {
    revalidateCatalog();
    expect(updateTag).toHaveBeenCalledWith(CATALOG_TAG);
  });
});
