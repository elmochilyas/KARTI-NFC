/**
 * Canonical commercial product model (specs/specs-vitrin/01-product-and-business-rules.md).
 *
 * Canonical identifiers are stable technical IDs and are never translated.
 * Career Card is a commercial specialization of a PERSON profile — do NOT
 * introduce CAREER as a third profiles.type.
 */

export const PRODUCT_TYPES = [
  "PERSONAL_CARD",
  "CAREER_CARD",
  "BUSINESS_CARD",
  "GOOGLE_REVIEW_CARD",
  "WHATSAPP_CARD",
  "INSTAGRAM_CARD",
  "CONTACT_CARD",
  "CUSTOM_LINK_CARD",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Smart Profile Cards resolve to a Karti profile; Direct cards resolve to an external URL. */
export type ProductFamily = "PROFILE" | "DIRECT";

/** Profile type required when the product needs a Karti profile. */
export type ProductProfileType = "PERSON" | "BUSINESS";

/** Final card destination behind the permanent /t/{short_code} URL. */
export type ProductCardDestination = "PROFILE" | "EXTERNAL_URL";

export function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value);
}
