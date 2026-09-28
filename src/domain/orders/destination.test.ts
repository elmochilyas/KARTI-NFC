import { describe, expect, it } from "vitest";
import { resolveOrderItemDestination } from "./destination";

describe("order item destination resolution", () => {
  it("resolves a supplied Google review URL", () => {
    expect(
      resolveOrderItemDestination("GOOGLE_REVIEW_CARD", {
        businessName: "Café X",
        reviewUrl: "https://g.page/cafe-x/review",
        needsUrlHelp: false,
      }),
    ).toEqual({ ok: true, url: "https://g.page/cafe-x/review" });
  });

  it("blocks Google provisioning while the URL is missing", () => {
    expect(
      resolveOrderItemDestination("GOOGLE_REVIEW_CARD", {
        businessName: "Café X",
        needsUrlHelp: true,
      }),
    ).toEqual({ ok: false, code: "DESTINATION_REQUIRED" });
  });

  it("rejects hostile Google review URLs", () => {
    expect(
      resolveOrderItemDestination("GOOGLE_REVIEW_CARD", {
        businessName: "Café X",
        reviewUrl: "javascript:alert(1)",
        needsUrlHelp: false,
      }),
    ).toEqual({ ok: false, code: "INVALID_DESTINATION" });
  });

  it("builds the canonical WhatsApp destination with message", () => {
    expect(
      resolveOrderItemDestination("WHATSAPP_CARD", {
        whatsappNumber: "+212612345678",
        predefinedMessage: "Hello",
      }),
    ).toEqual({ ok: true, url: "https://wa.me/212612345678?text=Hello" });
  });

  it("rejects malformed WhatsApp numbers", () => {
    expect(
      resolveOrderItemDestination("WHATSAPP_CARD", { whatsappNumber: "not-a-number" }),
    ).toEqual({ ok: false, code: "INVALID_DESTINATION" });
  });

  it("normalizes Instagram to the canonical profile URL", () => {
    expect(resolveOrderItemDestination("INSTAGRAM_CARD", { instagram: "@cafex" })).toEqual({
      ok: true,
      url: "https://www.instagram.com/cafex/",
    });
  });

  it("rejects non-Instagram destinations", () => {
    expect(
      resolveOrderItemDestination("INSTAGRAM_CARD", { instagram: "https://example.com/x" }),
    ).toEqual({ ok: false, code: "INVALID_DESTINATION" });
  });

  it("accepts validated custom HTTPS destinations only", () => {
    expect(
      resolveOrderItemDestination("CUSTOM_LINK_CARD", {
        destinationUrl: "https://example.com/menu",
      }),
    ).toEqual({ ok: true, url: "https://example.com/menu" });
    expect(
      resolveOrderItemDestination("CUSTOM_LINK_CARD", { destinationUrl: "ftp://example.com/x" }),
    ).toEqual({ ok: false, code: "INVALID_DESTINATION" });
  });

  it("never resolves profile products to a URL", () => {
    expect(resolveOrderItemDestination("PERSONAL_CARD", { fullName: "Ahmed" })).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
  });

  it("fails closed on malformed configuration", () => {
    expect(resolveOrderItemDestination("WHATSAPP_CARD", null)).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
    expect(resolveOrderItemDestination("WHATSAPP_CARD", "raw")).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
  });
});
