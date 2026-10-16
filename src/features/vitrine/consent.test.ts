import { describe, expect, it, vi } from "vitest";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  consentCookieHeader,
  isFreshConsent,
  notifyConsentChange,
  parseConsentChoice,
  readConsentCookie,
  serializeConsentChoice,
  type ConsentChoice,
} from "./consent";

const NOW = 1_800_000_000;

function choice(analytics: boolean, decidedAt = NOW): ConsentChoice {
  return { version: 1, analytics, decidedAt };
}

describe("consent storage (first-party, provider-neutral)", () => {
  it("round-trips accept and reject choices without identity", () => {
    expect(parseConsentChoice(serializeConsentChoice(choice(true)))).toEqual(choice(true));
    expect(parseConsentChoice(serializeConsentChoice(choice(false)))).toEqual(choice(false));
  });

  it("rejects malformed values (banner shows again, denied by default)", () => {
    expect(parseConsentChoice(null)).toBeNull();
    expect(parseConsentChoice("")).toBeNull();
    expect(parseConsentChoice("all")).toBeNull();
    expect(parseConsentChoice("v1:analytics=2:ts=123")).toBeNull();
    expect(parseConsentChoice("v1:analytics=1:ts=abc")).toBeNull();
    expect(parseConsentChoice("v1:analytics=1")).toBeNull();
  });

  it("stored consent restores correctly while fresh, expires after 180 days", () => {
    expect(isFreshConsent(choice(true, NOW), NOW)).toBe(true);
    expect(isFreshConsent(choice(true, NOW - CONSENT_MAX_AGE_SECONDS), NOW)).toBe(true);
    expect(isFreshConsent(choice(true, NOW - CONSENT_MAX_AGE_SECONDS - 1), NOW)).toBe(false);
    // Future timestamps never count as valid.
    expect(isFreshConsent(choice(true, NOW + 60), NOW)).toBe(false);
  });

  it("reads the first-party cookie and ignores unrelated cookies", () => {
    const header = consentCookieHeader(choice(true, NOW));
    expect(header).toContain(`${CONSENT_COOKIE}=`);
    expect(header).toContain("Path=/");
    expect(header).toContain("SameSite=Lax");
    expect(header).not.toContain("@");
    const raw = `karti_attr=abc; ${CONSENT_COOKIE}=${encodeURIComponent(
      serializeConsentChoice(choice(false, NOW)),
    )}; other=1`;
    expect(readConsentCookie(raw)).toEqual(choice(false, NOW));
    expect(readConsentCookie("karti_attr=abc; other=1")).toBeNull();
    expect(readConsentCookie(null)).toBeNull();
  });
});

describe("consent-change notification (consent-gated vendor loading)", () => {
  it("uses a dedicated event name (never the banner-reopen event)", () => {
    expect(CONSENT_CHANGE_EVENT).toBe("karti:consent-change");
    expect(CONSENT_CHANGE_EVENT).not.toBe("karti:open-consent");
  });

  it("dispatches the visitor choice so deferred loaders react without polling", () => {
    const dispatch = vi.fn();
    const g = globalThis as Record<string, unknown>;
    const prev = g["window"];
    g["window"] = { dispatchEvent: dispatch };
    try {
      notifyConsentChange(true);
      expect(dispatch).toHaveBeenCalledTimes(1);
      const event = dispatch.mock.calls[0]?.[0] as CustomEvent<{ analytics: boolean }>;
      expect(event.type).toBe(CONSENT_CHANGE_EVENT);
      expect(event.detail).toEqual({ analytics: true });
      notifyConsentChange(false);
      expect((dispatch.mock.calls[1]?.[0] as CustomEvent).detail).toEqual({ analytics: false });
    } finally {
      if (prev === undefined) delete g["window"];
      else g["window"] = prev;
    }
  });

  it("never throws without a window (SSR) or a broken dispatcher", () => {
    expect(() => notifyConsentChange(true)).not.toThrow();
    const g = globalThis as Record<string, unknown>;
    const prev = g["window"];
    g["window"] = {
      dispatchEvent: () => {
        throw new Error("blocked");
      },
    };
    try {
      expect(() => notifyConsentChange(false)).not.toThrow();
    } finally {
      if (prev === undefined) delete g["window"];
      else g["window"] = prev;
    }
  });
});
