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
    expect(() => trackEvent("order_submitted", { product: "X", quantity: 1, email: "a@b.c" })).toThrow(
      "PII key: email",
    );
    expect(transport).not.toHaveBeenCalled();
  });
});
