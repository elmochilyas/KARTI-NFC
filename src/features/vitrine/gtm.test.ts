import { afterEach, describe, expect, it } from "vitest";
import {
  buildConsentInitScript,
  buildGtmNoscriptUrl,
  buildGtmScriptUrl,
  CONSENT_DEFAULTS,
  CONSENT_SCRIPT_ID,
  consentUpdateFor,
  dataLayerHasConsent,
  ensureDataLayer,
  GTM_LOADED_FLAG,
  GTM_SCRIPT_ID,
  isReceiptRoute,
  isValidGtmId,
  pageTypeForPath,
  pushGtagConsent,
  sanitizePagePath,
} from "./gtm";
import { CONSENT_MAX_AGE_SECONDS, serializeConsentChoice } from "./consent";

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
    const layer = win["dataLayer"] as unknown[];
    expect(layer.length).toBe(1);
    // Google's gtag shim queues the `arguments` object (not a plain event
    // object): normalize array-likes before asserting the command shape.
    const command = Array.from(layer[0] as ArrayLike<unknown>);
    expect(command.slice(0, 2)).toEqual(["consent", "default"]);
    expect(command[2]).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(typeof win["gtag"]).toBe("function");
    // The defined gtag shim is reused (never overwritten) for updates.
    const gtagBefore = win["gtag"];
    expect(() => pushGtagConsent("update", consentUpdateFor(true))).not.toThrow();
    expect(win["gtag"]).toBe(gtagBefore);
    const update = Array.from((win["dataLayer"] as unknown[])[1] as ArrayLike<unknown>);
    expect(update.slice(0, 2)).toEqual(["consent", "update"]);
    expect(update[2]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
  });

  it("detects existing consent commands (array or arguments encoding)", () => {
    const win = stubWindow();
    expect(dataLayerHasConsent("default")).toBe(false);
    // Real-array encoding.
    (win["dataLayer"] as unknown[]) = [
      ["consent", "default", { ...CONSENT_DEFAULTS }],
      { event: "page_view" },
    ];
    expect(dataLayerHasConsent("default")).toBe(true);
    expect(dataLayerHasConsent("update")).toBe(false);
    // `arguments`-object encoding (what Google's gtag shim actually queues).
    function captureArgs(): unknown {
      // eslint-disable-next-line prefer-rest-params
      return arguments;
    }
    const argsEntry: unknown = (captureArgs as (...a: unknown[]) => unknown)(
      "consent",
      "update",
      consentUpdateFor(false),
    );
    (win["dataLayer"] as unknown[]) = [argsEntry];
    expect(dataLayerHasConsent("update")).toBe(true);
    expect(dataLayerHasConsent("default")).toBe(false);
    // Plain event objects are never consent commands.
    (win["dataLayer"] as unknown[]) = [{ event: "consent" }];
    expect(dataLayerHasConsent("default")).toBe(false);
    expect(dataLayerHasConsent("update")).toBe(false);
  });

  it("is safe without a window (SSR / blocked GTM)", () => {
    expect(dataLayerHasConsent("default")).toBe(false);
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

describe("receipt-route exclusion (GTM never loads on success URLs)", () => {
  it("matches localized receipt routes, query/hash ignored", () => {
    expect(isReceiptRoute("/fr/order/success")).toBe(true);
    expect(isReceiptRoute("/en/order/success")).toBe(true);
    expect(isReceiptRoute("/ar/order/success")).toBe(true);
    expect(isReceiptRoute("/fr/order/success?r=KARTI-1&t=abc")).toBe(true);
    expect(isReceiptRoute("/fr/order/success#top")).toBe(true);
    expect(isReceiptRoute("/fr/order/success/")).toBe(true);
  });

  it("does not match marketing, order, or lookalike routes", () => {
    expect(isReceiptRoute(null)).toBe(false);
    expect(isReceiptRoute(undefined)).toBe(false);
    expect(isReceiptRoute("")).toBe(false);
    expect(isReceiptRoute("/fr")).toBe(false);
    expect(isReceiptRoute("/fr/order")).toBe(false);
    expect(isReceiptRoute("/fr/order/successx")).toBe(false);
    expect(isReceiptRoute("/fr/products/personal-card")).toBe(false);
    expect(isReceiptRoute("/dashboard")).toBe(false);
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

describe("blocking consent init script (pre-GTM, Tag Assistant contract)", () => {
  /**
   * Execute the exact inline script a browser would run during parsing,
   * with stubbed `window`/`document` globals. Returns the fake window so
   * assertions inspect the real queued command shape.
   *
   * NOTE: the script-defined `gtag` resolves bare `window` at call time
   * (exactly like a real browser); keep the stubs installed while calling
   * it — use `installConsentEnv` directly for that.
   */
  function installConsentEnv(
    pathname: string,
    cookie: string,
  ): { win: Record<string, unknown>; restore: () => void } {
    const g = globalThis as Record<string, unknown>;
    const prevWindow = g["window"];
    const prevDocument = g["document"];
    const win: Record<string, unknown> = {
      location: { pathname },
      dataLayer: undefined,
    };
    g["window"] = win;
    g["document"] = { cookie };
    return {
      win,
      restore: () => {
        if (prevWindow === undefined) delete g["window"];
        else g["window"] = prevWindow;
        if (prevDocument === undefined) delete g["document"];
        else g["document"] = prevDocument;
      },
    };
  }

  function runConsentScript(pathname: string, cookie: string): Record<string, unknown> {
    const { win, restore } = installConsentEnv(pathname, cookie);
    try {
      new Function(buildConsentInitScript())();
    } finally {
      restore();
    }
    return win;
  }

  /** Normalize a queued entry: real array or `arguments` object. */
  function toCommand(entry: unknown): unknown[] | null {
    if (entry === null || typeof entry !== "object") return null;
    if (Array.isArray(entry)) return [...entry];
    if (typeof (entry as { length?: unknown }).length === "number") {
      return Array.from(entry as ArrayLike<unknown>);
    }
    return null;
  }

  function freshCookie(analytics: boolean, ageSeconds = 60): string {
    const now = Math.floor(Date.now() / 1000);
    const value = serializeConsentChoice({ version: 1, analytics, decidedAt: now - ageSeconds });
    return `karti_consent=${encodeURIComponent(value)}`;
  }

  it("uses Google's actual consent command format in the required order", () => {
    expect(CONSENT_SCRIPT_ID).toBe("karti-consent-default");
    const script = buildConsentInitScript();
    // dataLayer first, then the gtag shim, then the default-denied command.
    const dataLayerAt = script.indexOf("window.dataLayer=window.dataLayer||[]");
    const gtagDefAt = script.indexOf("function gtag(){window.dataLayer.push(arguments);}");
    const defaultAt = script.indexOf('"consent","default"');
    expect(dataLayerAt).toBeGreaterThanOrEqual(0);
    expect(gtagDefAt).toBeGreaterThan(dataLayerAt);
    expect(defaultAt).toBeGreaterThan(gtagDefAt);
    // All four categories denied by default.
    for (const key of [
      'analytics_storage:"denied"',
      'ad_storage:"denied"',
      'ad_user_data:"denied"',
      'ad_personalization:"denied"',
    ]) {
      expect(script).toContain(key);
    }
    // Never a plain event object; never loads GTM itself (the container
    // loads separately, after this script, via GtmBootstrap).
    expect(script).not.toContain("event:");
    expect(script).not.toContain("googletagmanager");
    expect(script).not.toContain("gtm.js");
    // Freshness window mirrors the first-party consent storage contract.
    expect(script).toContain(String(CONSENT_MAX_AGE_SECONDS));
  });

  it("queues gtag('consent','default',denied) and exposes window.gtag", () => {
    const { win, restore } = installConsentEnv("/fr", "");
    try {
      new Function(buildConsentInitScript())();
      const layer = win["dataLayer"] as unknown[];
      expect(Array.isArray(layer)).toBe(true);
      expect(layer).toHaveLength(1);
      expect(toCommand(layer[0])?.slice(0, 2)).toEqual(["consent", "default"]);
      expect(toCommand(layer[0])?.[2]).toEqual({ ...CONSENT_DEFAULTS });
      // The page-level gtag function exists for later updates (banner).
      expect(typeof win["gtag"]).toBe("function");
      (win["gtag"] as (...args: unknown[]) => void)("consent", "update", consentUpdateFor(true));
      expect(layer).toHaveLength(2);
      expect(toCommand((win["dataLayer"] as unknown[])[1])?.slice(0, 2)).toEqual([
        "consent",
        "update",
      ]);
    } finally {
      restore();
    }
  });

  it("stored accept grants analytics only; stored reject stays fully denied", () => {
    const accepted = runConsentScript("/fr", freshCookie(true));
    const acceptedLayer = accepted["dataLayer"] as unknown[];
    expect(acceptedLayer).toHaveLength(2);
    expect(toCommand(acceptedLayer[0])?.slice(0, 2)).toEqual(["consent", "default"]);
    const update = toCommand(acceptedLayer[1]);
    expect(update?.slice(0, 2)).toEqual(["consent", "update"]);
    expect(update?.[2]).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    const rejected = runConsentScript("/fr", freshCookie(false));
    expect((rejected["dataLayer"] as unknown[]) ?? []).toHaveLength(1);
  });

  it("ignores stale or malformed stored choices (defaults stand)", () => {
    const stale = runConsentScript("/fr", freshCookie(true, CONSENT_MAX_AGE_SECONDS + 60));
    expect((stale["dataLayer"] as unknown[]) ?? []).toHaveLength(1);

    for (const cookie of ["", "karti_consent=all", "karti_consent=v1%3Aanalytics%3D2%3Ats%3D123"]) {
      const win = runConsentScript("/fr", cookie);
      expect((win["dataLayer"] as unknown[]) ?? []).toHaveLength(1);
    }
  });

  it("receipt routes bail out before touching dataLayer (fully silent)", () => {
    for (const pathname of ["/fr/order/success", "/en/order/success", "/ar/order/success"]) {
      const win = runConsentScript(pathname, freshCookie(true));
      expect(win["dataLayer"]).toBeUndefined();
      expect(win["gtag"]).toBeUndefined();
    }
  });
});
