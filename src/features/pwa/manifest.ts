import { normalizePublicCode } from "@/domain/publicCode";

/**
 * Profile-specific PWA manifest builder (Phase 22).
 *
 * Every public profile gets its own install identity: the manifest name,
 * icon, and start_url all describe THAT profile — never a generic Karti
 * app. Pure — no I/O, no Supabase — so it is fully unit-testable. The
 * route layer (`/u/[code]/manifest.webmanifest`) owns the ACTIVE-only
 * gating; this module only shapes already-authorized public data.
 */

export const MANIFEST_DEFAULT_THEME_COLOR = "#0e7c5b";
export const MANIFEST_BACKGROUND_COLOR = "#ffffff";
export const MANIFEST_DISPLAY = "standalone" as const;
export const MANIFEST_DESCRIPTION_FALLBACK = "Digital business card";
export const SHORT_NAME_MAX_LENGTH = 12;

export type ProfileManifestInput = {
  displayName: string;
  publicCode: string;
  /** Absolute app origin (icons only) — e.g. https://karti.app. */
  appUrl: string;
  accentColor: string | null;
  bio: string | null;
};

export type ProfileManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  /** e.g. "any maskable" for the adaptive 512 entry; omitted otherwise. */
  purpose?: string;
};

export type ProfileManifest = {
  name: string;
  short_name: string;
  description: string;
  id: string;
  start_url: string;
  /** Navigation containment for the standalone window (Phase 23). */
  scope: string;
  display: typeof MANIFEST_DISPLAY;
  background_color: string;
  theme_color: string;
  icons: ProfileManifestIcon[];
};

/**
 * Accent passthrough with a safe fallback. Stored accents are hex-only by
 * Zod + DB CHECK, but render-time gating is the last line of defense —
 * a hostile value must never reach the manifest (or a `<meta>` tag).
 */
export function manifestThemeColor(accentColor: string | null): string {
  const candidate = accentColor?.trim() ?? "";
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : MANIFEST_DEFAULT_THEME_COLOR;
}

/** First display-name token, capped — home-screen labels stay short. */
export function manifestShortName(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] ?? "";
  const short = first.slice(0, SHORT_NAME_MAX_LENGTH);
  return short === "" ? "Karti" : short;
}

/**
 * Canonical install entry point. ALWAYS the immutable identity URL —
 * never the renamable slug, never the mutable NFC `/t/{shortCode}`
 * destination (card destinations can change behind the same tag).
 */
export function manifestStartUrl(publicCode: string): string {
  return `/u/${normalizePublicCode(publicCode)}`;
}

/** Absolute icon URL for the install identity (manifest icons must resolve). */
export function manifestIconUrl(
  appUrl: string,
  publicCode: string,
  file: "icon-192.png" | "icon-512.png",
): string {
  return `${appUrl.replace(/\/+$/, "")}/u/${normalizePublicCode(publicCode)}/${file}`;
}

export function buildProfileManifest(input: ProfileManifestInput): ProfileManifest {
  const name = input.displayName.trim() || "Karti Profile";
  const startUrl = manifestStartUrl(input.publicCode);
  const bio = input.bio?.trim() ?? "";
  return {
    name,
    short_name: manifestShortName(input.displayName),
    description: bio === "" ? MANIFEST_DESCRIPTION_FALLBACK : bio.slice(0, 140),
    id: startUrl,
    start_url: startUrl,
    // Standalone windows stay inside this profile's identity URL — the
    // installed card never navigates into a generic scope.
    scope: startUrl,
    display: MANIFEST_DISPLAY,
    background_color: MANIFEST_BACKGROUND_COLOR,
    theme_color: manifestThemeColor(input.accentColor),
    icons: [
      {
        src: manifestIconUrl(input.appUrl, input.publicCode, "icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: manifestIconUrl(input.appUrl, input.publicCode, "icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
      // Adaptive-icon entry for Android launchers: the 512 route renders
      // with a maskable safe-zone pad (see iconImage.ts), so this entry
      // survives circle/squircle cropping. Same bytes URL, purpose only.
      {
        src: manifestIconUrl(input.appUrl, input.publicCode, "icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
