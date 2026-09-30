import { describe, expect, it } from "vitest";
import { orderProductConfigurationSchema, productConfigSchemas } from "./schemas";

describe("product configuration schemas", () => {
  it("accepts a valid configuration for all eight products", () => {
    const valid = [
      {
        productType: "PERSONAL_CARD",
        configuration: { fullName: "Younes Barrag" },
      },
      {
        productType: "CAREER_CARD",
        configuration: { fullName: "Salma B.", hasCv: false },
      },
      {
        productType: "BUSINESS_CARD",
        configuration: { businessName: "Café Atlas" },
      },
      {
        productType: "GOOGLE_REVIEW_CARD",
        configuration: {
          businessName: "Café Atlas",
          reviewUrl: "https://g.page/r/abc123",
          needsUrlHelp: false,
        },
      },
      {
        productType: "WHATSAPP_CARD",
        configuration: { whatsappNumber: "0612345678" },
      },
      {
        productType: "INSTAGRAM_CARD",
        configuration: { instagram: "@cafe.atlas" },
      },
      {
        productType: "CONTACT_CARD",
        configuration: { fullName: "Younes", phone: "+212612345678" },
      },
      {
        productType: "CUSTOM_LINK_CARD",
        configuration: { destinationUrl: "https://example.com/menu" },
      },
    ] as const;

    for (const entry of valid) {
      expect(orderProductConfigurationSchema.safeParse(entry).success, JSON.stringify(entry)).toBe(
        true,
      );
    }
  });

  it("rejects missing required data", () => {
    expect(productConfigSchemas.PERSONAL_CARD.safeParse({}).success).toBe(false);
    expect(productConfigSchemas.BUSINESS_CARD.safeParse({}).success).toBe(false);
    expect(productConfigSchemas.WHATSAPP_CARD.safeParse({}).success).toBe(false);
    expect(
      productConfigSchemas.CONTACT_CARD.safeParse({
        fullName: "Younes",
      }).success,
    ).toBe(false);
    expect(productConfigSchemas.CUSTOM_LINK_CARD.safeParse({}).success).toBe(false);
  });

  it("rejects invalid data (length, phone, email, urls)", () => {
    expect(
      productConfigSchemas.PERSONAL_CARD.safeParse({
        fullName: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.WHATSAPP_CARD.safeParse({
        whatsappNumber: "nope",
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.INSTAGRAM_CARD.safeParse({
        instagram: "https://tiktok.com/@x",
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.CONTACT_CARD.safeParse({
        fullName: "Y",
        phone: "+212612345678",
        email: "not-an-email",
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.CUSTOM_LINK_CARD.safeParse({
        destinationUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched config for the product type", () => {
    expect(
      orderProductConfigurationSchema.safeParse({
        productType: "WHATSAPP_CARD",
        configuration: {
          businessName: "Café Atlas",
          reviewUrl: "https://g.page/r/x",
          needsUrlHelp: false,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields instead of persisting them", () => {
    expect(
      productConfigSchemas.WHATSAPP_CARD.safeParse({
        whatsappNumber: "0612345678",
        reviewUrl: "https://g.page/r/x",
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.PERSONAL_CARD.safeParse({
        fullName: "Younes",
        injectedAdmin: true,
      }).success,
    ).toBe(false);
  });

  it("google review: URL required when help=false, optional when help=true", () => {
    expect(
      productConfigSchemas.GOOGLE_REVIEW_CARD.safeParse({
        businessName: "Café Atlas",
        needsUrlHelp: false,
      }).success,
    ).toBe(false);
    expect(
      productConfigSchemas.GOOGLE_REVIEW_CARD.safeParse({
        businessName: "Café Atlas",
        needsUrlHelp: true,
      }).success,
    ).toBe(true);
    // Help=true with a hostile URL is still rejected.
    expect(
      productConfigSchemas.GOOGLE_REVIEW_CARD.safeParse({
        businessName: "Café Atlas",
        reviewUrl: "javascript:alert(1)",
        needsUrlHelp: true,
      }).success,
    ).toBe(false);
  });
});
