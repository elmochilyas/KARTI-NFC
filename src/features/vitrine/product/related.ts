import type { ProductType } from "@/domain/orders/productTypes";

/**
 * PDP cross-sell map (explicit per-product story, max 3, never self).
 * Shared by the landing page and the catalog route helper that preloads
 * related price lines — one source so grid and prices never disagree.
 */
export const RELATED_PRODUCTS: Record<ProductType, [ProductType, ProductType, ProductType]> = {
  PERSONAL_CARD: ["CAREER_CARD", "CONTACT_CARD", "BUSINESS_CARD"],
  CAREER_CARD: ["PERSONAL_CARD", "CONTACT_CARD", "BUSINESS_CARD"],
  BUSINESS_CARD: ["GOOGLE_REVIEW_CARD", "WHATSAPP_CARD", "INSTAGRAM_CARD"],
  GOOGLE_REVIEW_CARD: ["BUSINESS_CARD", "WHATSAPP_CARD", "INSTAGRAM_CARD"],
  WHATSAPP_CARD: ["BUSINESS_CARD", "GOOGLE_REVIEW_CARD", "CONTACT_CARD"],
  INSTAGRAM_CARD: ["BUSINESS_CARD", "GOOGLE_REVIEW_CARD", "CUSTOM_LINK_CARD"],
  CONTACT_CARD: ["PERSONAL_CARD", "CAREER_CARD", "BUSINESS_CARD"],
  CUSTOM_LINK_CARD: ["BUSINESS_CARD", "INSTAGRAM_CARD", "CONTACT_CARD"],
};

/** Related products minus unpublished entries (null flags = all listed). */
export function relatedFor(
  product: ProductType,
  publishedFlags?: Record<ProductType, boolean> | null,
): ProductType[] {
  return RELATED_PRODUCTS[product].filter((item) => publishedFlags?.[item] !== false);
}

export type RelatedCard = {
  product: ProductType;
  /** CMS display name override, or null (caller falls back to static copy). */
  name: string | null;
  /** Real configured price line, or null while unpriced (never guessed). */
  priceLine: string | null;
  /** CMS photo URL, or null (caller renders an honest placeholder). */
  imageUrl: string | null;
  /** Localized CMS alt (may be empty — caller falls back to the card name). */
  imageAlt: string;
};
