import type { PublicProfile } from "@/features/profiles/public";

/**
 * Digital wallet feature (ADR-046). One CTA, platform auto-detected —
 * the visitor never chooses Apple vs Google Wallet.
 */

export type WalletPlatform = "ios" | "android" | "desktop";

export type WalletErrorCode =
  "PROFILE_UNAVAILABLE" | "PLATFORM_UNSUPPORTED" | "WALLET_NOT_CONFIGURED" | "GENERATION_FAILED";

export type WalletResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: WalletErrorCode; message: string } };

/** Generic failure copy — never exposes technical detail to visitors. */
export const WALLET_GENERIC_FAILURE = "Unable to create wallet card. Please try again.";

/**
 * The only profile data wallet generation may touch. Built from the
 * ACTIVE-only public projection — no client records, notes, cards, or
 * timestamps. publicCode is the immutable identity (/u/{publicCode}).
 */
export type PublicWalletData = {
  publicCode: string;
  slug: string;
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  avatarPath: string | null;
  /** Public accent (page-rendered); drives the pass background. */
  accentColor: string | null;
};

export function toPublicWalletData(profile: PublicProfile): PublicWalletData {
  return {
    publicCode: profile.public_code,
    slug: profile.slug,
    displayName: profile.display_name,
    jobTitle: profile.job_title,
    companyName: profile.company_name,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    avatarPath: profile.avatar_path,
    accentColor: profile.accent_color,
  };
}

/** Upper bound per pass field — header/label hygiene for signed payloads. */
export const MAX_WALLET_FIELD_LENGTH = 120;

/**
 * Sanitize a free-text profile value for embedding in a signed wallet
 * payload (pass.json / JWT claims). Trims, strips control characters
 * (CR/LF/NULL → property/header-injection hygiene, same class as
 * validateSafeExternalUrl), drops empties to null, and truncates. Pure —
 * unit-tested with hostile fixtures.
 */
export function sanitizeWalletField(input: unknown, max = MAX_WALLET_FIELD_LENGTH): string | null {
  if (typeof input !== "string") return null;
  const scrubbed = input.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (scrubbed === "") return null;
  return scrubbed.length > max ? scrubbed.slice(0, max) : scrubbed;
}
