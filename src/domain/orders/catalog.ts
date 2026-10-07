/**
 * Typed product catalog (specs/specs-vitrin/03-order-domain-database-and-api.md §17).
 *
 * Commercial truth (the fixed base price) lives in `catalog_products` and is
 * edited by the operator in /dashboard/catalog. This static catalog carries
 * ONLY technical behavior per product (family, profile requirement,
 * destination, quantity bounds). Stored orders keep their own pricing
 * snapshot and are never recalculated.
 */

import type {
  ProductCardDestination,
  ProductFamily,
  ProductProfileType,
  ProductType,
} from "./productTypes";

export type MarketingProductDefinition = {
  id: ProductType;
  family: ProductFamily;
  requiresProfile: boolean;
  profileType?: ProductProfileType;
  destination: ProductCardDestination;
  minQuantity: number;
  /** Optional direct-order/bulk threshold; unset. */
  maxDirectQuantity?: number;
};

function define(def: MarketingProductDefinition): MarketingProductDefinition {
  return def;
}

export const MARKETING_PRODUCT_CATALOG: Record<ProductType, MarketingProductDefinition> = {
  PERSONAL_CARD: define({
    id: "PERSONAL_CARD",
    family: "PROFILE",
    requiresProfile: true,
    profileType: "PERSON",
    destination: "PROFILE",
    minQuantity: 1,
  }),
  CAREER_CARD: define({
    id: "CAREER_CARD",
    family: "PROFILE",
    requiresProfile: true,
    profileType: "PERSON",
    destination: "PROFILE",
    minQuantity: 1,
  }),
  BUSINESS_CARD: define({
    id: "BUSINESS_CARD",
    family: "PROFILE",
    requiresProfile: true,
    profileType: "BUSINESS",
    destination: "PROFILE",
    minQuantity: 1,
  }),
  GOOGLE_REVIEW_CARD: define({
    id: "GOOGLE_REVIEW_CARD",
    family: "DIRECT",
    requiresProfile: false,
    destination: "EXTERNAL_URL",
    minQuantity: 1,
  }),
  WHATSAPP_CARD: define({
    id: "WHATSAPP_CARD",
    family: "DIRECT",
    requiresProfile: false,
    destination: "EXTERNAL_URL",
    minQuantity: 1,
  }),
  INSTAGRAM_CARD: define({
    id: "INSTAGRAM_CARD",
    family: "DIRECT",
    requiresProfile: false,
    destination: "EXTERNAL_URL",
    minQuantity: 1,
  }),
  CONTACT_CARD: define({
    id: "CONTACT_CARD",
    family: "DIRECT",
    requiresProfile: true,
    profileType: "PERSON",
    destination: "PROFILE",
    minQuantity: 1,
  }),
  CUSTOM_LINK_CARD: define({
    id: "CUSTOM_LINK_CARD",
    family: "DIRECT",
    requiresProfile: false,
    destination: "EXTERNAL_URL",
    minQuantity: 1,
  }),
};

export function getProductDefinition(productType: ProductType): MarketingProductDefinition {
  return MARKETING_PRODUCT_CATALOG[productType];
}

export function requiresProfileForProduct(productType: ProductType): boolean {
  return MARKETING_PRODUCT_CATALOG[productType].requiresProfile;
}
