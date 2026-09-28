/**
 * Dashboard English product names. Mirrors the public EN marketing copy
 * for operator readability; canonical ProductType IDs are never
 * translated or used as display strings.
 */

import type { ProductType } from "@/domain/orders";

export const PRODUCT_DISPLAY_NAMES: Record<ProductType, string> = {
  PERSONAL_CARD: "Personal Card",
  CAREER_CARD: "Career Card",
  BUSINESS_CARD: "Business Card",
  GOOGLE_REVIEW_CARD: "Google Review Card",
  WHATSAPP_CARD: "WhatsApp Card",
  INSTAGRAM_CARD: "Instagram Card",
  CONTACT_CARD: "Contact Card",
  CUSTOM_LINK_CARD: "Custom Link Card",
};

export function productDisplayName(productType: ProductType | null): string {
  if (productType === null) return "Unknown product";
  return PRODUCT_DISPLAY_NAMES[productType];
}
