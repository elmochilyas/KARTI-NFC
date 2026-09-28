/**
 * Public product-slug ↔ canonical ProductType mapping (Phase 2).
 *
 * URL slugs are presentation only: checkout and order creation resolve
 * through this map, but the server mutation accepts strictly the
 * canonical ProductType enum — slug text never reaches the database.
 */

import {
  MARKETING_PRODUCT_CATALOG,
  type MarketingProductDefinition,
} from "@/domain/orders/catalog";
import { PRODUCT_TYPES, type ProductType } from "@/domain/orders/productTypes";

export const PRODUCT_PUBLIC_SLUGS = [
  "personal-card",
  "career-card",
  "business-card",
  "google-review-card",
  "whatsapp-card",
  "instagram-card",
  "contact-card",
  "custom-link-card",
] as const;

export type ProductPublicSlug = (typeof PRODUCT_PUBLIC_SLUGS)[number];

const SLUG_TO_PRODUCT: Record<ProductPublicSlug, ProductType> = {
  "personal-card": "PERSONAL_CARD",
  "career-card": "CAREER_CARD",
  "business-card": "BUSINESS_CARD",
  "google-review-card": "GOOGLE_REVIEW_CARD",
  "whatsapp-card": "WHATSAPP_CARD",
  "instagram-card": "INSTAGRAM_CARD",
  "contact-card": "CONTACT_CARD",
  "custom-link-card": "CUSTOM_LINK_CARD",
};

const PRODUCT_TO_SLUG: Record<ProductType, ProductPublicSlug> = {
  PERSONAL_CARD: "personal-card",
  CAREER_CARD: "career-card",
  BUSINESS_CARD: "business-card",
  GOOGLE_REVIEW_CARD: "google-review-card",
  WHATSAPP_CARD: "whatsapp-card",
  INSTAGRAM_CARD: "instagram-card",
  CONTACT_CARD: "contact-card",
  CUSTOM_LINK_CARD: "custom-link-card",
};

/** Resolve a URL slug to its canonical product, or null for unknown slugs. */
export function productTypeFromSlug(slug: unknown): ProductType | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim().toLowerCase();
  const found = (Object.keys(SLUG_TO_PRODUCT) as ProductPublicSlug[]).find(
    (key) => key === normalized,
  );
  return found ? SLUG_TO_PRODUCT[found] : null;
}

export function productSlugFromType(productType: ProductType): ProductPublicSlug {
  return PRODUCT_TO_SLUG[productType];
}

export function getProductMarketing(productType: ProductType): MarketingProductDefinition {
  return MARKETING_PRODUCT_CATALOG[productType];
}

/** All eight products in catalog order (covers every ProductType exactly once). */
export function allProducts(): ProductType[] {
  return [...PRODUCT_TYPES];
}

/** Related products: same family first, then the rest (max 3, excludes self). */
export function relatedProducts(productType: ProductType): ProductType[] {
  const def = MARKETING_PRODUCT_CATALOG[productType];
  const others = allProducts().filter((id) => id !== productType);
  const sameFamily = others.filter((id) => MARKETING_PRODUCT_CATALOG[id].family === def.family);
  const rest = others.filter((id) => MARKETING_PRODUCT_CATALOG[id].family !== def.family);
  return [...sameFamily, ...rest].slice(0, 3);
}
