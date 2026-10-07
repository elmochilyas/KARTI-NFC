import { describe, expect, it, vi } from "vitest";
import { PRODUCT_TYPES, type ProductType } from "@/domain/orders/productTypes";
import { productSlugFromType } from "@/features/vitrine/products";
import { MediaManager } from "@/features/catalog/components/MediaManager";
import { PricingForm } from "@/features/catalog/components/PricingForm";
import { LocalizationForm } from "@/features/catalog/components/LocalizationForm";
import { ErrorState } from "@/components/ui/states";
import type { CatalogDb } from "@/features/catalog/types";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("next/link", () => ({ default: function LinkStub(props: any) {
  return props;
} }));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CatalogEditorPage from "./page";

const mockedCreateClient = vi.mocked(createClient);

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

/** Production-shaped stub: QUOTE + null price, no image, empty media. */
function pageFakeDb(options: {
  types?: ProductType[];
  locRows?: Record<string, unknown>[];
  mediaRows?: Record<string, unknown>[];
  signedOut?: boolean;
}): CatalogDb {
  const types = options.types ?? [...PRODUCT_TYPES];
  const products: Record<string, Record<string, unknown>> = {};
  for (const t of types) products[t] = quoteProductRow(t);
  const locRows =
    options.locRows ??
    types.flatMap((t) => ["fr", "en", "ar"].map((locale) => emptyLocRow(t, locale)));
  const mediaRows = options.mediaRows ?? [];
  const chainFor = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      eq: (col: string, value: unknown) => {
        filters.push([col, value]);
        return chain;
      },
      order: () => chain,
      maybeSingle: async () => ({ data: resolveAll()[0] ?? null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => void) =>
        resolve({ data: resolveAll(), error: null }),
    };
    const matches = (row: Record<string, unknown>) =>
      filters.every(([col, value]) => row[col] === value);
    const resolveAll = (): unknown[] => {
      if (table === "catalog_products")
        return Object.values(products).filter((row) => matches(row));
      if (table === "catalog_product_localizations")
        return locRows.filter((row) => matches(row));
      return mediaRows.filter((row) => matches(row));
    };
    return chain;
  };
  return {
    auth: {
      getClaims: options.signedOut
        ? async () => {
            throw new Error("no session");
          }
        : async () => ({ data: { claims: { sub: "test-admin" } }, error: null }),
    },
    from: (table: string) => ({ select: () => chainFor(table) }),
  } as unknown as CatalogDb;
}

type ElementLike = { type?: unknown; props?: Record<string, unknown> };

/** Walk the unrendered element tree, including elements nested in any prop
 * (e.g. the preview Link inside PageHeader `actions`). */
function allElements(root: unknown): ElementLike[] {
  const out: ElementLike[] = [];
  const seen = new Set<unknown>();
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    if (Array.isArray(node)) {
      seen.add(node);
      stack.push(...node);
      continue;
    }
    seen.add(node);
    const el = node as ElementLike;
    if (!("type" in (node as object)) || !el.props || typeof el.props !== "object") continue;
    out.push(el);
    for (const value of Object.values(el.props)) {
      if (typeof value === "function") continue;
      if (Array.isArray(value)) stack.push(...value);
      else if (value && typeof value === "object") stack.push(value);
    }
  }
  return out;
}

function findAll(root: unknown, type: unknown): ElementLike[] {
  return allElements(root).filter((el) => el.type === type);
}

const propsOf = (productType: string) => ({ params: Promise.resolve({ productType }) });

describe("catalog editor page", () => {
  it("loads every one of the 8 editor routes with valid empty CMS state", async () => {
    expect(PRODUCT_TYPES).toHaveLength(8);
    mockedCreateClient.mockResolvedValue(pageFakeDb({}) as never);
    for (const productType of PRODUCT_TYPES) {
      const element = await CatalogEditorPage(propsOf(productType));
      const managers = findAll(element, MediaManager);
      expect(managers).toHaveLength(1);
      const mediaProps = managers[0].props as Record<string, unknown>;
      // Regression guard for the production crash: only pre-bound Server
      // Actions may cross the Server → Client boundary. The old
      // `altActionFor` closure prop must not come back.
      expect(typeof mediaProps["updateAltAction"]).toBe("function");
      expect(typeof mediaProps["moveAction"]).toBe("function");
      expect("altActionFor" in (managers[0].props as object)).toBe(false);
      expect(
        (mediaProps["updateAltAction"] as { name?: string }).name,
      ).toBe("bound updateCatalogMediaAltAction");
      expect((mediaProps["moveAction"] as { name?: string }).name).toBe(
        "bound moveCatalogMediaAction",
      );
      // QUOTE + null price + no image renders as empty editor state.
      expect(mediaProps["media"]).toEqual([]);
      expect(mediaProps["primaryImagePath"]).toBeNull();
      expect(mediaProps["ogImagePath"]).toBeNull();
      const pricing = findAll(element, PricingForm);
      expect(pricing).toHaveLength(1);
      expect(pricing[0].props?.["initialValues"]).toMatchObject({
        published: true,
        pricingMode: "QUOTE",
        priceMad: "",
        availability: "",
      });
      // FR / EN / AR sections with SEO fields.
      const locs = findAll(element, LocalizationForm);
      expect(locs.map((el) => el.props?.["locale"]).sort()).toEqual(["ar", "en", "fr"]);
      // Preview link targets the public product page.
      const links = findAll(element, Link);
      expect(links).toHaveLength(1);
      expect(links[0].props?.["href"]).toBe(`/fr/products/${productSlugFromType(productType)}`);
    }
  });

  it("renders missing localization rows as empty editor sections", async () => {
    mockedCreateClient.mockResolvedValue(pageFakeDb({ locRows: [] }) as never);
    const element = await CatalogEditorPage(propsOf("CUSTOM_LINK_CARD"));
    const locs = findAll(element, LocalizationForm);
    expect(locs).toHaveLength(3);
    for (const loc of locs) expect(loc.props?.["row"]).toBeNull();
  });

  it("passes stored media through to the upload area", async () => {
    const mediaRow = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      product_type: "CUSTOM_LINK_CARD",
      storage_path: "catalog/CUSTOM_LINK_CARD/gallery/0123456789abcdef.jpg",
      media_role: "GALLERY",
      sort_order: 0,
      alt_fr: null,
      alt_en: null,
      alt_ar: null,
      created_at: "2026-10-01T14:42:57.273Z",
    };
    mockedCreateClient.mockResolvedValue(pageFakeDb({ mediaRows: [mediaRow] }) as never);
    const element = await CatalogEditorPage(propsOf("CUSTOM_LINK_CARD"));
    const managers = findAll(element, MediaManager);
    expect(managers).toHaveLength(1);
    expect(managers[0].props?.["media"]).toHaveLength(1);
  });

  it("fails safely for an invalid ProductType", async () => {
    mockedCreateClient.mockResolvedValue(pageFakeDb({}) as never);
    await expect(CatalogEditorPage(propsOf("NOT_A_PRODUCT"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders an error state instead of crashing when signed out", async () => {
    mockedCreateClient.mockResolvedValue(pageFakeDb({ signedOut: true }) as never);
    const element = await CatalogEditorPage(propsOf("CUSTOM_LINK_CARD"));
    expect(findAll(element, ErrorState).length).toBeGreaterThan(0);
    expect(findAll(element, MediaManager)).toHaveLength(0);
  });

  it("never exposes the editor to an authenticated non-admin (RLS returns no rows)", async () => {
    mockedCreateClient.mockResolvedValue(pageFakeDb({ types: [] }) as never);
    await expect(CatalogEditorPage(propsOf("CUSTOM_LINK_CARD"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
