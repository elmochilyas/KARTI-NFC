import { describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  consentCookieHeader,
  isFreshConsent,
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
