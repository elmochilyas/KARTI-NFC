/**
 * Phase 34 split: client-safe public-asset URL helpers.
 *
 * `storage.ts` mixes these pure string builders with the server-side sharp
 * pipeline. Public/client-rendered components (notably `ProfileSections`,
 * rendered inside the dashboard live preview) must never pull sharp into
 * the browser bundle, so the pure helpers live here dependency-free.
 * `storage.ts` re-exports them — existing server imports keep working.
 */

export const PROFILE_ASSETS_BUCKET = "profile-assets";

export type DetectedImageKind = "jpg" | "png" | "webp";

/**
 * Detect the real image kind from magic bytes (first 12 bytes suffice for
 * JPEG/PNG/WebP). Pure — unit-tested. Browser-provided `file.type` is never
 * trusted on its own: a forged type on an HTML/JS payload must not reach
 * the public bucket. Lives here (not storage.ts) so the on-demand PWA icon
 * route stays free of the sharp/upload pipeline.
 */
export function detectImageKind(header: Uint8Array): DetectedImageKind | null {
  const startsWith = (sig: number[]): boolean => sig.every((byte, i) => header[i] === byte);
  if (startsWith([0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

/**
 * Zero-client public asset URL (tap-path fast path).
 *
 * `getPublicUrl` is pure string-building — no network — so the public page
 * does not need a throwaway Supabase client just to render `<Image src>`.
 * Output is byte-identical to `publicAssetUrl` (same base + bucket + path).
 * Returns null when storage is unconfigured or path is null.
 */
export function publicAssetPathUrl(path: string | null): string | null {
  if (!path) return null;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  return `${raw.replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_ASSETS_BUCKET}/${path}`;
}

/** Origin (`https://xyz.supabase.co`) for `<link rel="preconnect">` on tap. */
export function storageOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}
