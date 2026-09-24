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
