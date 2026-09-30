/**
 * GTM transport regressions: safe events reach dataLayer, PII never does,
 * receipt credentials never leak, and a blocked GTM never breaks the app.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAnalyticsTransport, trackEvent } from "./analytics";
import { gtmTransport } from "./gtmTransport";

const WINDOW_KEY = "__kartiGtmTransportWindow__";

function stubWindow(): Record<string, unknown> {
  const store: Record<string, unknown> = {};
  (globalThis as Record<string, unknown>)[WINDOW_KEY] = (globalThis as Record<string, unknown>)[
    "window"
  ];
  (globalThis as Record<string, unknown>)["window"] = store;
  return store;
}

function dataLayerOf(win: Record<string, unknown>): Array<Record<string, unknown>> {
  return (win["dataLayer"] as Array<Record<string, unknown>>) ?? [];
}

beforeEach(() => {
  setAnalyticsTransport(null);
});

afterEach(() => {
  setAnalyticsTransport(null);
  const g = globalThis as Record<string, unknown>;
  if (WINDOW_KEY in g) {
    const prev = g[WINDOW_KEY];
    if (prev === undefined) delete g["window"];
    else g["window"] = prev;
    delete g[WINDOW_KEY];
  }
  vi.unstubAllEnvs();
});

describe("GTM dataLayer transport", () => {
  it("pushes a safe event (product_cta_click) with its schema", () => {
    const win = stubWindow();
    setAnalyticsTransport(gtmTransport);
    trackEvent("product_cta_click", { product: "GOOGLE_REVIEW_CARD", locale: "fr" });
    expect(dataLayerOf(win)).toEqual([
      { event: "product_cta_click", product: "GOOGLE_REVIEW_CARD", locale: "fr" },
    ]);
  });

  it("delivers order_submitted with safe categorical data only (no PII)", () => {
    const win = stubWindow();
    setAnalyticsTransport(gtmTransport);
    trackEvent("order_submitted", { product: "PERSONAL_CARD", quantity: 2, locale: "ar" });
    const entries = dataLayerOf(win);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      event: "order_submitted",
      product: "PERSONAL_CARD",
      quantity: 2,
      locale: "ar",
    });
    const text = JSON.stringify(entries[0]);
    for (const leak of ["@", "KARTI-", "212", "token"]) {
      expect(text).not.toContain(leak);
    }
  });

  it("blocks unsafe keys (privacy guard) before the transport runs", () => {
    stubWindow();
    const seen: unknown[] = [];
    setAnalyticsTransport((event, payload) => {
      seen.push({ event, payload });
      gtmTransport(event, payload);
    });
    for (const payload of [
      { email: "a@b.c" },
      { phone: "+2126" },
      { receipt_token: "a".repeat(64) },
      { receipt_hash: "b".repeat(64) },
      { customer_note: "hello" },
      { delivery_instructions: "ring twice" },
      { inquiry_message: "partnership?" },
      { whatsapp_number: "2126" },
    ]) {
      expect(() => trackEvent("order_submitted", payload)).toThrow(/PII key/);
    }
    expect(seen).toEqual([]);
  });

  it("never exposes the receipt credential via page_path", () => {
    const win = stubWindow();
    setAnalyticsTransport(gtmTransport);
    trackEvent("page_view", {
      page_path: `/fr/order/success?r=KARTI-000010&t=${"a".repeat(64)}`,
      locale: "fr",
      page_type: "order_success",
    });
    expect(dataLayerOf(win)).toEqual([
      {
        event: "page_view",
        page_path: "/fr/order/success",
        locale: "fr",
        page_type: "order_success",
      },
    ]);
  });

  it("drops nested objects instead of pushing them to GTM", () => {
    const win = stubWindow();
    gtmTransport("product_cta_click", {
      product: "PERSONAL_CARD",
      locale: "fr",
      // Forced past the flat type to prove the runtime guard.
      nested: { email: "a@b.c" } as unknown as string,
    });
    expect(dataLayerOf(win)).toEqual([
      { event: "product_cta_click", product: "PERSONAL_CARD", locale: "fr" },
    ]);
  });

  it("does not crash when GTM/dataLayer is unavailable", () => {
    // No window stub: SSR / ad-blocker conditions.
    setAnalyticsTransport(gtmTransport);
    expect(() => trackEvent("homepage_view", { locale: "fr" })).not.toThrow();
    expect(() => gtmTransport("homepage_view", { locale: "fr" })).not.toThrow();
  });

  it("NEXT_PUBLIC_GTM_ID missing → app works, GTM simply not injected", async () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    const { getGtmId } = await import("@/lib/env");
    expect(getGtmId()).toBeUndefined();
    setAnalyticsTransport(null);
    expect(() => trackEvent("homepage_view", { locale: "en" })).not.toThrow();
  });

  it("NEXT_PUBLIC_GTM_ID=GTM-PCXTLTM7 → exact production container", async () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-PCXTLTM7");
    const { getGtmId } = await import("@/lib/env");
    expect(getGtmId()).toBe("GTM-PCXTLTM7");
  });

  it("order_submitted fires once, before a full-page receipt navigation", () => {
    // The success URL carries a private credential: the wizard must emit
    // the conversion event first, then leave via a full document load
    // (never SPA router.push — GA4 would auto-collect page_location).
    const source = fs.readFileSync(path.join(__dirname, "order", "OrderWizard.tsx"), "utf8");
    const submittedAt = source.indexOf('trackEvent("order_submitted"');
    expect(submittedAt).toBeGreaterThan(-1);
    const assignAt = source.indexOf("window.location.assign");
    expect(assignAt).toBeGreaterThan(submittedAt);
    expect(source).toContain("/order/success");
    expect(source).not.toContain("router.push");
    // Runtime half: the emission itself is synchronous and exactly-once.
    const win = stubWindow();
    const seen: unknown[] = [];
    setAnalyticsTransport((event, payload) => {
      seen.push({ event, payload });
      gtmTransport(event, payload);
    });
    trackEvent("order_submitted", { product: "PERSONAL_CARD", quantity: 1, locale: "fr" });
    expect(seen).toHaveLength(1);
    expect(dataLayerOf(win)).toHaveLength(1);
  });
});
