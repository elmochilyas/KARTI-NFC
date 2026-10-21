import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductDefinition } from "@/domain/orders/catalog";
import { isProductType, type ProductType } from "@/domain/orders/productTypes";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import type { Database } from "@/types/database";
import { catalogAssetUrl } from "./storagePaths";
import type { CatalogAvailability } from "./types";

type AdminDb = SupabaseClient<Database>;

/**
 * Published-only public catalog projection (ADR-018/032 pattern).
 *
 * Reads through the server-only service-role client with an explicit
 * public-safe column list. Unpublished products resolve to null — the
 * caller falls back to static copy. No unpublished content
 * (copy, price, images) ever leaves this module.
 */

export type PublicCatalogFaq = { q: string; a: string };

export type PublicCatalogGalleryImage = {
  /** Absolute public URL of the catalog asset. */
  url: string;
  /** Localized alt text (may be empty when the operator set none — callers fall back to the product name). */
  alt: string;
};

/**
 * CMS media row projected for the marketing/compact slots (rail, header
 * category panel). Alt is localized with an fr → en → ar fallback and may
 * be null when the operator set none (the caller then keeps the neutral
 * placeholder / decorative frame).
 */
export type PublicCatalogImage = {
  url: string;
  alt: string | null;
};

export type PublicCatalogProduct = {
  productType: ProductType;
  published: boolean;
  /** Fixed base price in minor units, or null while "Price not configured". */
  priceMinor: number | null;
  currency: "MAD";
  availability: CatalogAvailability | null;
  primaryImageUrl: string | null;
  /** Localized alt of the primary image (its media row), or null. */
  primaryImageAlt: string | null;
  /**
   * First CARD_PREVIEW image (sort_order), or null. Compact marketing
   * slots (home rail) fall back to it when no primary image is set.
   */
  cardPreviewImage: PublicCatalogImage | null;
  /** Extra GALLERY images for the product page (primary image excluded). */
  gallery: PublicCatalogImage[];
  ogImageUrl: string | null;
  /** PRIMARY first, then GALLERY in operator sort order (dashboard CMS, unlimited up to the 30-row schema bound). */
  galleryImages: PublicCatalogGalleryImage[];
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
  const out: PublicCatalogFaq[] = [];
  if (!Array.isArray(value)) return out;
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

type CatalogMediaRow = {
  storage_path: string;
  media_role: string;
  sort_order: number;
  alt_fr: string | null;
  alt_en: string | null;
  alt_ar: string | null;
};

/** Gallery cap for the public product page (extra images beyond the primary). */
const MAX_GALLERY_IMAGES = 6;

function cleanAlt(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** Requested locale → fr → en → first available. Never invents alt text. */
function mediaAlt(row: CatalogMediaRow | undefined, locale: VitrineLocale): string | null {
  if (!row) return null;
  const chain = [row.alt_fr, row.alt_en, row.alt_ar];
  const preferred = chain[["fr", "en", "ar"].indexOf(locale)] ?? null;
  for (const candidate of [preferred, ...chain]) {
    const alt = cleanAlt(candidate);
    if (alt) return alt;
  }
  return null;
}

/**
 * Media rows for one product. Fail-safe: empty list (the page then falls
 * back to the primary image pointer / decorative placeholder).
 */
async function getCatalogMedia(
  supabase: AdminDb,
  productType: ProductType,
): Promise<CatalogMediaRow[]> {
  try {
    const res = await supabase
      .from("catalog_product_media")
      .select("storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar")
      .eq("product_type", productType)
      .order("sort_order");
    if (res.error || !res.data) return [];
    return res.data;
  } catch {
    return [];
  }
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
    price_minor: number | null;
    currency: string;
    availability: string | null;
    primary_image_path: string | null;
    og_image_path: string | null;
  } | null = null;
  try {
    const res = await supabase
      .from("catalog_products")
      .select("published,price_minor,currency,availability,primary_image_path,og_image_path")
      .eq("product_type", productType)
      .maybeSingle();
    if (res.error || !res.data) return null;
    productRow = res.data;
  } catch {
    return null;
  }
  if (!productRow.published) return null;
  // NULL price = "Price not configured" (readiness state, not a mode).
  // The row is still returned so callers can render honest unpriced UI;
  // price-gated callers (Offer, ordering) check priceMinor themselves.
  const priceMinor =
    typeof productRow.price_minor === "number" && productRow.price_minor > 0
      ? productRow.price_minor
      : null;
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

  let galleryImages: PublicCatalogGalleryImage[] = [];
  try {
    const res = await supabase
      .from("catalog_product_media")
      .select("storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar")
      .eq("product_type", productType)
      .in("media_role", ["PRIMARY", "GALLERY"])
      .order("sort_order");
    if (!res.error && res.data) {
      const primaryPath = productRow.primary_image_path;
      const rows = [...res.data]
        .filter((row) => row.media_role === "PRIMARY" || row.media_role === "GALLERY")
        .sort((a, b) => {
          const aFirst = a.storage_path === primaryPath ? 0 : 1;
          const bFirst = b.storage_path === primaryPath ? 0 : 1;
          if (aFirst !== bFirst) return aFirst - bFirst;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
      galleryImages = rows.map((row) => {
        const byLocale = locale === "ar" ? row.alt_ar : locale === "en" ? row.alt_en : row.alt_fr;
        const alt =
          [byLocale, row.alt_en, row.alt_fr, row.alt_ar]
            .find((value) => typeof value === "string" && value.trim() !== "")
            ?.trim() ?? "";
        return { url: catalogAssetUrl(row.storage_path), alt };
      });
    }
  } catch {
    galleryImages = [];
  }

  // Marketing/compact media: the admin-set primary pointer is authoritative
  // for the URL; a PRIMARY media row heals the orphaned-row case (pointer
  // lost, row still present). CARD_PREVIEW supplies the compact-slot
  // fallback. Additive to the PDP gallery above — never replaces it.
  const mediaRows = await getCatalogMedia(supabase, productType);
  const pointerPath = productRow.primary_image_path;
  const primaryRow =
    mediaRows.find((row) => row.storage_path === pointerPath) ??
    mediaRows.find((row) => row.media_role === "PRIMARY");
  const marketingPrimaryPath = pointerPath ?? primaryRow?.storage_path ?? null;
  const gallery: PublicCatalogImage[] = mediaRows
    .filter((row) => row.media_role === "GALLERY" && row.storage_path !== marketingPrimaryPath)
    .slice(0, MAX_GALLERY_IMAGES)
    .map((row) => ({ url: catalogAssetUrl(row.storage_path), alt: mediaAlt(row, locale) }));
  const cardPreviewRow = mediaRows.find((row) => row.media_role === "CARD_PREVIEW");

  return {
    productType,
    published: true,
    priceMinor,
    currency: "MAD",
    availability,
    // The CMS primary pointer is authoritative; a PRIMARY media row heals
    // the orphaned-row case (pointer lost, row still present). Keeps the
    // PDP `primaryImageUrl` contract (related cards, metadata images) and
    // the marketing slot resolution aligned on the same primary.
    primaryImageUrl: marketingPrimaryPath ? catalogAssetUrl(marketingPrimaryPath) : null,
    primaryImageAlt: mediaAlt(primaryRow, locale),
    cardPreviewImage: cardPreviewRow
      ? { url: catalogAssetUrl(cardPreviewRow.storage_path), alt: mediaAlt(cardPreviewRow, locale) }
      : null,
    gallery,
    ogImageUrl: productRow.og_image_path
      ? catalogAssetUrl(productRow.og_image_path)
      : marketingPrimaryPath
        ? catalogAssetUrl(marketingPrimaryPath)
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
    galleryImages,
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
  /** Fixed base price in minor units, or null while "Price not configured". */
  priceMinor: number | null;
};

/**
 * Server-authoritative catalog state for order submission (never browser input).
 *
 * Returns null only when the catalog is unreachable — the caller must
 * refuse the order (fail honestly, never a guessed price). A resolved row
 * with `published: false` or `priceMinor: null` means new orders for this
 * product are blocked.
 */
export async function getOrderCatalogPrice(
  productType: ProductType,
  supabase: AdminDb,
): Promise<OrderCatalogState | null> {
  if (!isProductType(productType)) return null;
  try {
    const res = await supabase
      .from("catalog_products")
      .select("published,price_minor")
      .eq("product_type", productType)
      .maybeSingle();
    if (res.error || !res.data) return null;
    if (res.data.published !== true) {
      return { published: false, priceMinor: null };
    }
    if (
      typeof res.data.price_minor === "number" &&
      Number.isSafeInteger(res.data.price_minor) &&
      res.data.price_minor > 0
    ) {
      return { published: true, priceMinor: res.data.price_minor };
    }
    return { published: true, priceMinor: null };
  } catch {
    return null;
  }
}
