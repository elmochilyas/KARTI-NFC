import type { WalletPlatform } from "./types";

/**
 * Platform detection for the single "Add to Wallet" CTA (ADR-046).
 *
 * Pure function over the User-Agent string plus optional client hints
 * (`navigator.userAgentData`: iPadOS in desktop mode reports "Macintosh",
 * so the island forwards `platform`/`mobile` when available). The server
 * route sniffs the UA header alone; the island passes hints for precision.
 * The visitor never chooses a wallet — detection decides.
 */

export type PlatformHints = {
  /** e.g. navigator.userAgentData?.platform ("iOS", "Android", "macOS", …). */
  platform?: string;
  /** e.g. navigator.userAgentData?.mobile. */
  mobile?: boolean;
};

export function detectPlatform(userAgent: unknown, hints?: PlatformHints): WalletPlatform {
  const ua = typeof userAgent === "string" ? userAgent : "";
  const platform = (hints?.platform ?? "").toLowerCase();

  // iOS: explicit hint, iPhone/iPad/iPod tokens, or touch Mac (iPadOS
  // desktop mode reports "Macintosh" — mobile hint disambiguates).
  if (platform === "ios" || /iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && (hints?.mobile === true || /mobile/i.test(ua))) return "ios";

  // Android (covers Chrome, Samsung Internet, Firefox — all open the same
  // Google Wallet save link; no intent hacks per the ADR-042 moratorium).
  if (platform === "android" || /android/i.test(ua)) return "android";

  return "desktop";
}
