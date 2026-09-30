import { afterEach, describe, expect, it } from "vitest";
import {
  buildGtmNoscriptUrl,
  buildGtmScriptUrl,
  CONSENT_DEFAULTS,
  consentUpdateFor,
  ensureDataLayer,
  GTM_LOADED_FLAG,
  GTM_SCRIPT_ID,
  isValidGtmId,
  pageTypeForPath,
  pushGtagConsent,
  sanitizePagePath,
} from "./gtm";

const WINDOW_KEY = "__kartiGtmTestWindow__";

function stubWindow(): Record<string, unknown> {
  const store: Record<string, unknown> = {};
  (globalThis as Record<string, unknown>)[WINDOW_KEY] = (globalThis as Record<string, unknown>)[
    "window"
  ];
  (globalThis as Record<string, unknown>)["window"] = store;
  return store;
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  if (WINDOW_KEY in g) {
    const prev = g[WINDOW_KEY];
    if (prev === undefined) delete (g as Record<string, unknown>)["window"];
    else g["window"] = prev;
    delete g[WINDOW_KEY];
  }
});

describe("GTM container identity", () => {
  it("accepts the production container GTM-PCXTLTM7", () => {
    expect(isValidGtmId("GTM-PCXTLTM7")).toBe(true);
  });

  it("rejects absent or malformed IDs (GTM must simply not load)", () => {
    expect(isValidGtmId(undefined)).toBe(false);
    expect(isValidGtmId("")).toBe(false);
    expect(isValidGtmId("  ")).toBe(false);
    expect(isValidGtmId("G-XXXXXXXXXX")).toBe(false);
    expect(isValidGtmId("gtm-lowercase")).toBe(false);
    expect(isValidGtmId("GTM-PCXTLTM7;alert(1)")).toBe(false);
  });

  it("builds the exact Google container URLs exactly once (no duplicates)", () => {
    expect(buildGtmScriptUrl("GTM-PCXTLTM7")).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-PCXTLTM7",
    );
    expect(buildGtmNoscriptUrl("GTM-PCXTLTM7")).toBe(
      "https://www.googletagmanager.com/ns.html?id=GTM-PCXTLTM7",
    );
    expect(GTM_SCRIPT_ID).toBe("karti-gtm");
    expect(GTM_LOADED_FLAG).toBe("__kartiGtmLoaded");
  });
});

describe("dataLayer bootstrap", () => {
  it("creates dataLayer before events and never throws", () => {
    const win = stubWindow();
    expect(ensureDataLayer()).toEqual([]);
    expect(Array.isArray(win["dataLayer"])).toBe(true);
  });

  it("keeps an existing dataLayer (early events queue, nothing lost)", () => {
    const win = stubWindow();
    win["dataLayer"] = [{ event: "early" }];
    expect(ensureDataLayer()).toEqual([{ event: "early" }]);
  });

  it("is safe without a window (SSR / blocked GTM)", () => {
    expect(ensureDataLayer()).toEqual([]);
  });
});

describe("Consent Mode foundation", () => {
  it("defaults everything to denied", () => {
    expect(CONSENT_DEFAULTS).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("accept grants analytics only — advertising stays denied", () => {
    expect(consentUpdateFor(true)).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("reject keeps everything denied", () => {
    const update = consentUpdateFor(false);
    expect(update.analytics_storage).toBe("denied");
    expect(update.ad_storage).toBe("denied");
    expect(update.ad_user_data).toBe("denied");
    expect(update.ad_personalization).toBe("denied");
  });

  it("pushes standard gtag consent commands and never throws when blocked", () => {
    const win = stubWindow();
    pushGtagConsent("default", { ...CONSENT_DEFAULTS });
    const layer = win["dataLayer"] as unknown[][];
    expect(layer.length).toBe(1);
    expect(Array.from(layer[0] as unknown[]).slice(0, 2)).toEqual(["consent", "default"]);
    expect(() => pushGtagConsent("update", consentUpdateFor(true))).not.toThrow();
  });
});

describe("receipt URL sanitization", () => {
  it("strips the receipt credential query from the success URL", () => {
    const token = "a".repeat(64);
    expect(sanitizePagePath(`/fr/order/success?r=KARTI-000010&t=${token}`)).toBe(
      "/fr/order/success",
    );
  });

  it("strips hashes, keeps pathname-only, caps length", () => {
    expect(sanitizePagePath("/fr/pricing?utm_source=x#faq")).toBe("/fr/pricing");
    expect(sanitizePagePath("")).toBe("/");
    expect(sanitizePagePath("/fr/order/success?")).toBe("/fr/order/success");
    const long = `/${"a".repeat(500)}`;
    expect(sanitizePagePath(long).length).toBeLessThanOrEqual(200);
  });
});

describe("page_type derivation", () => {
  it("classifies sanitized public routes", () => {
    expect(pageTypeForPath("/fr")).toBe("home");
    expect(pageTypeForPath("/en/products/personal-card")).toBe("product");
    expect(pageTypeForPath("/ar/solutions/businesses")).toBe("solution");
    expect(pageTypeForPath("/fr/how-it-works")).toBe("how_it_works");
    expect(pageTypeForPath("/fr/pricing")).toBe("pricing");
    expect(pageTypeForPath("/fr/examples")).toBe("examples");
    expect(pageTypeForPath("/fr/faq")).toBe("faq");
    expect(pageTypeForPath("/fr/resources")).toBe("resources");
    expect(pageTypeForPath("/fr/resources/nfc-vs-qr")).toBe("article");
    expect(pageTypeForPath("/fr/contact")).toBe("contact");
    expect(pageTypeForPath("/fr/order")).toBe("order");
    expect(pageTypeForPath("/fr/order/success")).toBe("order_success");
    expect(pageTypeForPath("/fr/privacy")).toBe("legal");
  });
});
