import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  isAnalyticsEventName,
  scrubAnalyticsPayload,
  setAnalyticsTransport,
  trackEvent,
} from "./analytics";

describe("analytics adapter", () => {
  beforeEach(() => {
    setAnalyticsTransport(null);
  });

  it("exposes the canonical funnel event set", () => {
    for (const name of [
      "homepage_view",
      "page_view",
      "goal_selected",
      "tap_demo_changed",
      "product_page_view",
      "product_cta_click",
      "order_started",
      "order_submitted",
      "whatsapp_clicked",
      "contact_inquiry_submitted",
    ]) {
      expect(isAnalyticsEventName(name)).toBe(true);
    }
    expect(isAnalyticsEventName("user_clicked_stuff")).toBe(false);
    expect(ANALYTICS_EVENTS.length).toBeGreaterThan(10);
  });

  it("rejects PII payload keys loudly", () => {
    expect(() => scrubAnalyticsPayload({ phone: "+2126" })).toThrow("PII key: phone");
    expect(() => scrubAnalyticsPayload({ email: "a@b.c" })).toThrow("PII key: email");
    expect(() => scrubAnalyticsPayload({ order_number: "KARTI-1" })).toThrow(
      "PII key: order_number",
    );
    expect(() => scrubAnalyticsPayload({ message: "hi" })).toThrow("PII key: message");
    expect(() => scrubAnalyticsPayload({ receipt_token: "a".repeat(64) })).toThrow(
      "PII key: receipt_token",
    );
    expect(() => scrubAnalyticsPayload({ receipt_hash: "b".repeat(64) })).toThrow(
      "PII key: receipt_hash",
    );
    expect(() => scrubAnalyticsPayload({ customer_note: "hi" })).toThrow(
      "PII key: customer_note",
    );
    expect(() => scrubAnalyticsPayload({ delivery_instructions: "ring" })).toThrow(
      "PII key: delivery_instructions",
    );
    expect(() => scrubAnalyticsPayload({ inquiry_message: "x" })).toThrow(
      "PII key: inquiry_message",
    );
    expect(() => scrubAnalyticsPayload({ whatsapp_number: "212" })).toThrow(
      "PII key: whatsapp_number",
    );
    expect(scrubAnalyticsPayload({ product: "PERSONAL_CARD", locale: "fr", step: 1 })).toEqual({
      product: "PERSONAL_CARD",
      locale: "fr",
      step: 1,
    });
  });

  it("routes events through the pluggable transport", () => {
    const seen: Array<{ event: string; payload: Record<string, unknown> }> = [];
    setAnalyticsTransport((event, payload) => {
      seen.push({ event, payload });
    });
    trackEvent("goal_selected", { product: "CAREER_CARD", locale: "fr" });
    expect(seen).toEqual([
      { event: "goal_selected", payload: { product: "CAREER_CARD", locale: "fr" } },
    ]);
  });

  it("is a safe no-op without a vendor", () => {
    expect(() => trackEvent("homepage_view", { locale: "ar" })).not.toThrow();
  });

  it("scrubs before transporting, never after", () => {
    const transport = vi.fn();
    setAnalyticsTransport(transport);
    expect(() =>
      trackEvent("order_submitted", { product: "X", quantity: 1, email: "a@b.c" }),
    ).toThrow("PII key: email");
    expect(transport).not.toHaveBeenCalled();
  });
});
