import { describe, expect, it } from "vitest";
import {
  buildTouch,
  emptyTouch,
  isMeaningfulTouch,
  mergeTouch,
  parseAttributionCookie,
  serializeAttributionCookie,
} from "./attribution";

describe("attribution persistence", () => {
  it("parses malformed cookies to an empty snapshot", () => {
    expect(parseAttributionCookie(null)).toEqual({ first: null, last: null });
    expect(parseAttributionCookie("")).toEqual({ first: null, last: null });
    expect(parseAttributionCookie("not-json")).toEqual({ first: null, last: null });
    expect(parseAttributionCookie(JSON.stringify({ first: { path: "/fr" } }))).toEqual({
      first: {
        path: "/fr",
        referrerHost: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        utmTerm: null,
      },
      last: null,
    });
  });

  it("keeps first touch across internal navigation", () => {
    const first = {
      ...emptyTouch(),
      path: "/fr",
      referrerHost: "google.com",
    };
    const merged = mergeTouch({ first, last: null }, { ...emptyTouch(), path: "/fr/order" });
    expect(merged.first).toEqual(first);
    expect(merged.last).toBeNull();
  });

  it("updates last touch on a new external campaign entry", () => {
    const first = { ...emptyTouch(), path: "/fr", referrerHost: "google.com" };
    const campaign = {
      ...emptyTouch(),
      path: "/fr/products/whatsapp-card",
      utmSource: "instagram",
      utmMedium: "organic_social",
      utmCampaign: "launch",
    };
    const merged = mergeTouch({ first, last: null }, campaign);
    expect(merged.first).toEqual(first);
    expect(merged.last).toEqual(campaign);
  });

  it("does not update last touch for identical entries", () => {
    const touch = { ...emptyTouch(), path: "/fr", referrerHost: "google.com" };
    const merged = mergeTouch({ first: touch, last: touch }, { ...touch });
    expect(merged.last).toEqual(touch);
  });

  it("round-trips through serialization", () => {
    const snapshot = {
      first: { ...emptyTouch(), path: "/fr" },
      last: { ...emptyTouch(), path: "/fr/order", utmSource: "tiktok" },
    };
    expect(parseAttributionCookie(serializeAttributionCookie(snapshot))).toEqual(snapshot);
  });

  it("drops same-origin referrers and keeps external hosts only", () => {
    const internal = buildTouch({
      path: "/fr/order",
      referrer: "https://karti.pro/fr",
      origin: "https://karti.pro",
      params: {},
    });
    expect(internal.referrerHost).toBeNull();
    expect(isMeaningfulTouch(internal)).toBe(false);

    const external = buildTouch({
      path: "/fr",
      referrer: "https://www.google.com/search?q=karti",
      origin: "https://karti.pro",
      params: { utm_source: "google" },
    });
    expect(external.referrerHost).toBe("www.google.com");
    expect(isMeaningfulTouch(external)).toBe(true);
  });
});
