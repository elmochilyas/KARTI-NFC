import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import { getPublishedCatalogProduct, getPublishedFlags, type PublicCatalogProduct } from "./public";

/**
 * Zero-stale cross-request cache for the public catalog (ADR-045 pattern).
 *
 * - Cached indefinitely (`revalidate: false`) — dashboard edits purge
 *   synchronously via `revalidateCatalog()`, so price/copy changes are
 *   visible without a redeploy and never lag a TTL window.
 * - One global tag (`catalog-products`): any catalog write purges every
 *   product/locale entry. At 8 products × 3 locales the over-purge cost
 *   (one refetch per page after any edit) is negligible.
 * - Order submission does NOT use this cache: `createPublicOrderAction`
 *   reads the live row so the snapshot is always current.
 */
export const CATALOG_TAG = "catalog-products";

async function fetchCatalogProduct(
  productType: ProductType,
  locale: VitrineLocale,
): Promise<PublicCatalogProduct | null> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  return getPublishedCatalogProduct(productType, locale, supabase);
}

export const getCachedCatalogProduct = unstable_cache(fetchCatalogProduct, ["catalog-product"], {
  tags: [CATALOG_TAG],
  revalidate: false,
});

async function fetchPublishedFlags(): Promise<Record<ProductType, boolean>> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return {
      PERSONAL_CARD: true,
      CAREER_CARD: true,
      BUSINESS_CARD: true,
      GOOGLE_REVIEW_CARD: true,
      WHATSAPP_CARD: true,
      INSTAGRAM_CARD: true,
      CONTACT_CARD: true,
      CUSTOM_LINK_CARD: true,
    };
  }
  return getPublishedFlags(supabase);
}

export const getCachedPublishedFlags = unstable_cache(fetchPublishedFlags, ["catalog-flags"], {
  tags: [CATALOG_TAG],
  revalidate: false,
});

/**
 * Purge all cached catalog entries after any catalog write. Uses
 * `updateTag` (immediate Server-Action semantics — same rationale as
 * `revalidatePublicProfiles`). Call next to `revalidatePath` in
 * dashboard catalog actions.
 */
export function revalidateCatalog(): void {
  updateTag(CATALOG_TAG);
}
