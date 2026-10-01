import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductDefinition } from "@/domain/orders/catalog";
import { isProductType, type ProductType } from "@/domain/orders/productTypes";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import type { Database } from "@/types/database";
import { catalogAssetUrl } from "./storagePaths";
import type { CatalogAvailability, CatalogPricingMode } from "./types";

type AdminDb = SupabaseClient<Database>;

/**
 * Published-only public catalog projection (ADR-018/032 pattern).
 *
 * Reads through the server-only service-role client with an explicit
 * public-safe column list. Unpublished products resolve to null — the
 * caller falls back to static copy in QUOTE mode. No unpublished content
 * (copy, price, images) ever leaves this module.
 */

export type PublicCatalogFaq = { q: string; a: string };

export type PublicCatalogProduct = {
  productType: ProductType;
  published: boolean;
  pricingMode: CatalogPricingMode;
  /** Truthful price in minor units, or null for QUOTE. */
  priceMinor: number | null;
  currency: "MAD";
  availability: CatalogAvailability | null;
  primaryImageUrl: string | null;
  ogImageUrl: string | null;
  displayName: string | null;
  shortName: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  shortDescription: string | null;
  outcomeText: string | null;
  pricingNote: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  audiences: string[];
  benefits: string[];
  useCases: string[];
  included: string[];
  faqs: PublicCatalogFaq[];
};

function cleanList(value: unknown, maxItem: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed === "" || trimmed.length > maxItem || /[<>]/.test(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function cleanFaqs(value: unknown): PublicCatalogFaq[] {
  if (!Array.isArray(value)) return [];
  const out: PublicCatalogFaq[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.q !== "string" || typeof record.a !== "string") continue;
    const q = record.q.trim();
    const a = record.a.trim();
    if (q === "" || a === "" || q.length > 160 || a.length > 1000) continue;
    if (/[<>]/.test(q) || /[<>]/.test(a)) continue;
    out.push({ q, a });
    if (out.length >= 20) break;
  }
  return out;
}

/** Published catalog product for public rendering, or null (unpublished/unknown/error). */
export async function getPublishedCatalogProduct(
  productType: ProductType,
  locale: VitrineLocale,
  supabase: AdminDb,
): Promise<PublicCatalogProduct | null> {
  if (!isProductType(productType)) return null;
  // Technical behavior always comes from the static definition.
  getProductDefinition(productType);

  let productRow: {
    published: boolean;
    pricing_mode: string;
    price_minor: number | null;
    currency: string;
    availability: string | null;
    primary_image_path: string | null;
    og_image_path: string | null;
  } | null = null;
  try {
    const res = await supabase
      .from("catalog_products")
      .select(
        "published,pricing_mode,price_minor,currency,availability,primary_image_path,og_image_path",
      )
      .eq("product_type", productType)
      .maybeSingle();
    if (res.error || !res.data) return null;
    productRow = res.data;
  } catch {
    return null;
  }
  if (!productRow.published) return null;
  const pricingMode: CatalogPricingMode =
    productRow.pricing_mode === "FIXED" || productRow.pricing_mode === "FROM"
      ? productRow.pricing_mode
      : "QUOTE";
  // QUOTE must never carry a price; FIXED/FROM must carry a positive one.
  const priceMinor =
    pricingMode === "QUOTE"
      ? null
      : typeof productRow.price_minor === "number" && productRow.price_minor > 0
        ? productRow.price_minor
        : null;
  if (pricingMode !== "QUOTE" && priceMinor === null) return null;
  const availability: CatalogAvailability | null =
    productRow.availability === "IN_STOCK" ||
    productRow.availability === "OUT_OF_STOCK" ||
    productRow.availability === "PREORDER"
      ? productRow.availability
      : null;

  let locRow: {
    display_name: string | null;
    short_name: string | null;
    hero_title: string | null;
    hero_description: string | null;
    short_description: string | null;
    outcome_text: string | null;
    pricing_note: string | null;
    seo_title: string | null;
    seo_description: string | null;
    audiences: unknown;
    benefits: unknown;
    use_cases: unknown;
    included: unknown;
    faqs: unknown;
  } | null = null;
  try {
    const res = await supabase
      .from("catalog_product_localizations")
      .select(
        "display_name,short_name,hero_title,hero_description,short_description,outcome_text,pricing_note,seo_title,seo_description,audiences,benefits,use_cases,included,faqs",
      )
      .eq("product_type", productType)
      .eq("locale", locale)
      .maybeSingle();
    if (!res.error && res.data) locRow = res.data;
  } catch {
    locRow = null;
  }

  return {
    productType,
    published: true,
    pricingMode,
    priceMinor,
    currency: "MAD",
    availability,
    primaryImageUrl: productRow.primary_image_path
      ? catalogAssetUrl(productRow.primary_image_path)
      : null,
    ogImageUrl: productRow.og_image_path
      ? catalogAssetUrl(productRow.og_image_path)
      : productRow.primary_image_path
        ? catalogAssetUrl(productRow.primary_image_path)
        : null,
    displayName: locRow?.display_name ?? null,
    shortName: locRow?.short_name ?? null,
    heroTitle: locRow?.hero_title ?? null,
    heroDescription: locRow?.hero_description ?? null,
    shortDescription: locRow?.short_description ?? null,
    outcomeText: locRow?.outcome_text ?? null,
    pricingNote: locRow?.pricing_note ?? null,
    seoTitle: locRow?.seo_title ?? null,
    seoDescription: locRow?.seo_description ?? null,
    audiences: cleanList(locRow?.audiences, 120, 12),
    benefits: cleanList(locRow?.benefits, 200, 12),
    useCases: cleanList(locRow?.use_cases, 200, 12),
    included: cleanList(locRow?.included, 200, 20),
    faqs: cleanFaqs(locRow?.faqs),
  };
}

/** Published flags for all 8 products (sitemap/listings filter). Fail-safe: all true. */
export async function getPublishedFlags(supabase: AdminDb): Promise<Record<ProductType, boolean>> {
  const fallback: Record<ProductType, boolean> = {
    PERSONAL_CARD: true,
    CAREER_CARD: true,
    BUSINESS_CARD: true,
    GOOGLE_REVIEW_CARD: true,
    WHATSAPP_CARD: true,
    INSTAGRAM_CARD: true,
    CONTACT_CARD: true,
    CUSTOM_LINK_CARD: true,
  };
  try {
    const res = await supabase.from("catalog_products").select("product_type,published");
    if (res.error || !res.data) return fallback;
    const flags = { ...fallback };
    for (const row of res.data) {
      if (isProductType(row.product_type)) flags[row.product_type] = row.published === true;
    }
    return flags;
  } catch {
    return fallback;
  }
}

export type OrderCatalogState = {
  /** False when the operator unpublished the product — new orders are blocked. */
  published: boolean;
  pricingMode: CatalogPricingMode;
  /** Truthful unit price minor, or null for QUOTE. */
  priceMinor: number | null;
};

/**
 * Server-authoritative catalog state for order submission (never browser input).
 *
 * Returns null only when the catalog is unreachable — the caller falls back
 * to static QUOTE pricing (fail-safe, never a wrong price). A resolved row
 * with `published: false` means new orders for this product are blocked;
 * QUOTE rows keep the historical quote flow.
 */
export async function getOrderCatalogPrice(
  productType: ProductType,
  supabase: AdminDb,
): Promise<OrderCatalogState | null> {
  if (!isProductType(productType)) return null;
  try {
    const res = await supabase
      .from("catalog_products")
      .select("published,pricing_mode,price_minor")
      .eq("product_type", productType)
      .maybeSingle();
    if (res.error || !res.data) return null;
    if (res.data.published !== true) {
      return { published: false, pricingMode: "QUOTE", priceMinor: null };
    }
    if (res.data.pricing_mode === "QUOTE") {
      return { published: true, pricingMode: "QUOTE", priceMinor: null };
    }
    if (
      (res.data.pricing_mode === "FIXED" || res.data.pricing_mode === "FROM") &&
      typeof res.data.price_minor === "number" &&
      Number.isSafeInteger(res.data.price_minor) &&
      res.data.price_minor > 0
    ) {
      return {
        published: true,
        pricingMode: res.data.pricing_mode,
        priceMinor: res.data.price_minor,
      };
    }
    // Malformed priced row (e.g. positive CHECK bypassed) → quote-safe.
    return { published: true, pricingMode: "QUOTE", priceMinor: null };
  } catch {
    return null;
  }
}
