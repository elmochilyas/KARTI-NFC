import { describe, expect, it } from "vitest";
import {
  MARKETING_PRODUCT_CATALOG,
  getProductDefinition,
  requiresProfileForProduct,
} from "./catalog";
import { PRODUCT_TYPES } from "./productTypes";

describe("marketing product catalog", () => {
  it("exposes all eight canonical products", () => {
    expect(Object.keys(MARKETING_PRODUCT_CATALOG).sort()).toEqual([...PRODUCT_TYPES].sort());
  });

  it("pins the fixed product-to-profile/destination mapping for all eight", () => {
    expect(getProductDefinition("PERSONAL_CARD")).toMatchObject({
      family: "PROFILE",
      requiresProfile: true,
      profileType: "PERSON",
      destination: "PROFILE",
    });
    expect(getProductDefinition("CAREER_CARD")).toMatchObject({
      family: "PROFILE",
      requiresProfile: true,
      profileType: "PERSON",
      destination: "PROFILE",
    });
    expect(getProductDefinition("BUSINESS_CARD")).toMatchObject({
      family: "PROFILE",
      requiresProfile: true,
      profileType: "BUSINESS",
      destination: "PROFILE",
    });
    // CONTACT_CARD is commercially DIRECT but still requires a PERSON
    // profile and resolves to PROFILE — never a profile-less EXTERNAL_URL.
    expect(getProductDefinition("CONTACT_CARD")).toMatchObject({
      family: "DIRECT",
      requiresProfile: true,
      profileType: "PERSON",
      destination: "PROFILE",
    });
    for (const id of [
      "GOOGLE_REVIEW_CARD",
      "WHATSAPP_CARD",
      "INSTAGRAM_CARD",
      "CUSTOM_LINK_CARD",
    ] as const) {
      expect(getProductDefinition(id)).toMatchObject({
        family: "DIRECT",
        requiresProfile: false,
        destination: "EXTERNAL_URL",
      });
      expect(getProductDefinition(id).profileType).toBeUndefined();
    }
  });

  it("maps direct products to EXTERNAL_URL with no profile", () => {
    for (const id of [
      "GOOGLE_REVIEW_CARD",
      "WHATSAPP_CARD",
      "INSTAGRAM_CARD",
      "CUSTOM_LINK_CARD",
    ] as const) {
      const def = getProductDefinition(id);
      expect(def.requiresProfile).toBe(false);
      expect(def.profileType).toBeUndefined();
      expect(def.destination).toBe("EXTERNAL_URL");
      expect(def.family).toBe("DIRECT");
    }
  });

  it("keeps every product QUOTE with no invented price (V1)", () => {
    for (const def of Object.values(MARKETING_PRODUCT_CATALOG)) {
      expect(def.pricingMode).toBe("QUOTE");
      expect(def.priceMinor).toBeUndefined();
      expect(def.minQuantity).toBeGreaterThan(0);
    }
  });

  it("never introduces CAREER as a profile type", () => {
    for (const def of Object.values(MARKETING_PRODUCT_CATALOG)) {
      expect((def.profileType as string | undefined) === "CAREER").toBe(false);
    }
  });

  it("requiresProfileForProduct follows the fixed mapping", () => {
    expect(requiresProfileForProduct("PERSONAL_CARD")).toBe(true);
    expect(requiresProfileForProduct("WHATSAPP_CARD")).toBe(false);
    expect(requiresProfileForProduct("CUSTOM_LINK_CARD")).toBe(false);
  });
});
