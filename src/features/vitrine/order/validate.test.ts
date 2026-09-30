import { describe, expect, it } from "vitest";
import {
  resolveWhatsapp,
  validateConfig,
  validateCustomer,
  validateDelivery,
  validateQuantity,
} from "./validate";

describe("validateConfig", () => {
  it("accepts valid configs and returns parsed data", () => {
    const result = validateConfig("PERSONAL_CARD", { fullName: "Younes" });
    expect(result.ok).toBe(true);
  });

  it("maps missing/invalid fields to keys", () => {
    const missing = validateConfig("PERSONAL_CARD", {});
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.fullName).toBe("required");

    const badPhone = validateConfig("WHATSAPP_CARD", { whatsappNumber: "xx" });
    if (!badPhone.ok) expect(badPhone.errors.whatsappNumber).toBe("invalidPhone");

    const badIg = validateConfig("INSTAGRAM_CARD", { instagram: "https://tiktok.com/x" });
    if (!badIg.ok) expect(badIg.errors.instagram).toBe("invalidInstagram");

    const badUrl = validateConfig("CUSTOM_LINK_CARD", { destinationUrl: "javascript:x" });
    if (!badUrl.ok) expect(badUrl.errors.destinationUrl).toBe("invalidUrl");
  });

  it("maps Google review URL problems to reviewUrlRequired", () => {
    const result = validateConfig("GOOGLE_REVIEW_CARD", {
      businessName: "Café",
      needsUrlHelp: false,
    });
    if (!result.ok) expect(result.errors.reviewUrl).toBe("reviewUrlRequired");
  });
});

describe("validateCustomer", () => {
  const base = {
    fullName: "Younes Barrag",
    phone: "0612345678",
    sameWhatsapp: true,
    whatsapp: "",
    email: "",
    preferredContact: "WHATSAPP" as const,
  };

  it("accepts a minimal valid form", () => {
    expect(validateCustomer(base)).toEqual({});
  });

  it("requires name and valid phone", () => {
    const errors = validateCustomer({ ...base, fullName: "  ", phone: "abc" });
    expect(errors.fullName).toBe("required");
    expect(errors.phone).toBe("invalidPhone");
  });

  it("requires email when EMAIL is the preferred contact", () => {
    expect(validateCustomer({ ...base, preferredContact: "EMAIL" }).email).toBe("required");
    expect(validateCustomer({ ...base, preferredContact: "EMAIL", email: "bad" }).email).toBe(
      "invalidEmail",
    );
    expect(validateCustomer({ ...base, preferredContact: "EMAIL", email: "a@b.co" })).toEqual({});
  });

  it("still validates optional email when provided", () => {
    expect(validateCustomer({ ...base, email: "bad" }).email).toBe("invalidEmail");
  });

  it("validates explicit WhatsApp only when separate", () => {
    expect(validateCustomer({ ...base, sameWhatsapp: false, whatsapp: "bad" }).whatsapp).toBe(
      "invalidPhone",
    );
    expect(validateCustomer({ ...base, sameWhatsapp: false, whatsapp: "" })).toEqual({});
  });
});

describe("resolveWhatsapp", () => {
  it("derives from phone when same-number is enabled", () => {
    expect(
      resolveWhatsapp({
        fullName: "Y",
        phone: "0612345678",
        sameWhatsapp: true,
        whatsapp: "",
        email: "",
        preferredContact: "PHONE",
      }),
    ).toBe("0612345678");
  });
});

describe("validateDelivery / validateQuantity", () => {
  it("requires city and address", () => {
    expect(validateDelivery({ city: "", address: "", instructions: "" })).toEqual({
      city: "required",
      address: "required",
    });
  });

  it("accepts integer quantities >= 1", () => {
    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity("2")).toBe(false);
  });
});
