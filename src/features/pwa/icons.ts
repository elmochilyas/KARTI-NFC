/**
 * Profile home-screen icon helpers (Phase 22, PWA "Keep this Card").
 *
 * The installed icon must represent the person/business: the current
 * profile avatar, center-cropped to a square — or, when no avatar exists,
 * an initials tile in the profile accent. Pure (no I/O): the sharp
 * rendering step lives in `iconImage.ts`; this module owns sizes, text,
 * and colors so it is fully unit-testable.
 */

/** Served icon files → rendered pixel sizes (square PNGs). */
export const PROFILE_ICON_SIZES = {
  "icon-192.png": 192,
  "icon-512.png": 512,
  /** iOS home-screen icon (Apple standard 180px). */
  "apple-touch-icon.png": 180,
} as const;

export type ProfileIconFile = keyof typeof PROFILE_ICON_SIZES;

export const ICON_FALLBACK_BACKGROUND = "#0e7c5b";
/** Storage fetch guard: icons are tiny — never buffer a huge payload. */
export const ICON_SOURCE_MAX_BYTES = 5 * 1024 * 1024;

/** "Ilyas El Moch" → "IE"; "Atlas" → "AT"; blank → "K". */
export function iconInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "K";
  const first = parts[0] ?? "";
  if (parts.length === 1) return (first.slice(0, 2) || "K").toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Accent passthrough with a safe fallback (hex-only, like the manifest). */
export function iconBackground(accentColor: string | null): string {
  const candidate = accentColor?.trim() ?? "";
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : ICON_FALLBACK_BACKGROUND;
}

/**
 * Fallback tile SVG (rasterized by the route via sharp). The initials are
 * XML-escaped; the background is hex-validated by `iconBackground`, so no
 * attribute injection is possible.
 */
export function iconFallbackSvg(initials: string, background: string, px: number): string {
  const safe = initials
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const fontSize = Math.round(px * 0.42);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
    `viewBox="0 0 ${px} ${px}">` +
    `<rect width="${px}" height="${px}" fill="${background}"/>` +
    `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" ` +
    `font-size="${fontSize}" font-weight="700" fill="#ffffff">${safe}</text></svg>`
  );
}
