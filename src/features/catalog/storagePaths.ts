import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Catalog asset storage paths (client-safe: no sharp import here — the
 * dashboard live preview imports this module in the browser bundle).
 *
 * Bucket: `catalog-assets` (public read, admin-only writes).
 * Paths: `catalog/{PRODUCT_TYPE}/{role}/{16hex}.{ext}` — server-generated
 * only, never accepted from browser input except as a managed-path match.
 */

export const CATALOG_ASSETS_BUCKET = "catalog-assets";

export type CatalogMediaRole = "PRIMARY" | "GALLERY" | "CARD_PREVIEW" | "OG";

const ROLE_SEGMENT: Record<CatalogMediaRole, string> = {
  PRIMARY: "primary",
  GALLERY: "gallery",
  CARD_PREVIEW: "card-preview",
  OG: "og",
};

const MANAGED_CATALOG_PATH_PATTERN =
  /^catalog\/[A-Z_]+\/(primary|gallery|card-preview|og)\/[0-9a-f]{16}\.(jpg|png|webp)$/;

/** Managed-object gate: only server-generated catalog paths may be removed. */
export function isManagedCatalogPath(path: string): boolean {
  return MANAGED_CATALOG_PATH_PATTERN.test(path);
}

/** Server-generated object path for a new catalog upload. */
export function catalogAssetPath(
  productType: string,
  role: CatalogMediaRole,
  extension: "jpg" | "png" | "webp",
): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const safeType = productType.replace(/[^A-Z_]/g, "");
  return `catalog/${safeType}/${ROLE_SEGMENT[role]}/${hex}.${extension}`;
}

export function storageOrigin(): string {
  return getSupabasePublicConfig().url;
}

/** Zero-client public URL for a catalog asset path. */
export function catalogAssetUrl(path: string): string {
  return `${storageOrigin()}/storage/v1/object/public/${CATALOG_ASSETS_BUCKET}/${path}`;
}
