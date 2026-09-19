import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type StorageDb = SupabaseClient<Database>;

export const PROFILE_ASSETS_BUCKET = "profile-assets";
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type AssetKind = "avatar" | "cover";

export type AssetResult = { ok: true; path: string } | { ok: false; message: string };

async function requireAdmin(supabase: StorageDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

function extensionFor(mimeType: string): string | null {
  return ALLOWED_MIME_TYPES.get(mimeType) ?? null;
}

/** Safe generated path — never trusts client filenames. */
export function assetPath(profileId: string, kind: AssetKind, extension: string): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  return `profiles/${profileId}/${kind}/${suffix}.${extension}`;
}

/**
 * Upload a new asset. Returns the storage path; the caller updates the
 * profile row, then removes the replaced path (safe order: the old image
 * is never deleted before the new one is stored + referenced).
 */
export async function uploadAsset(
  profileId: string,
  kind: AssetKind,
  file: File,
  supabase: StorageDb,
): Promise<AssetResult> {
  if (!(await requireAdmin(supabase))) {
    return { ok: false, message: "Sign in to upload images." };
  }
  const extension = extensionFor(file.type);
  if (!extension) {
    return { ok: false, message: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size > MAX_ASSET_BYTES) {
    return { ok: false, message: "Images must be 5 MB or smaller." };
  }
  if (file.size === 0) {
    return { ok: false, message: "The selected file is empty." };
  }

  const path = assetPath(profileId, kind, extension);
  const { error } = await supabase.storage
    .from(PROFILE_ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { ok: false, message: "Upload failed. Please try again." };
  }
  return { ok: true, path };
}

/** Remove a previously stored asset. Best-effort: failures are reported, not thrown. */
export async function removeAsset(
  path: string,
  supabase: StorageDb,
): Promise<{ ok: boolean; message?: string }> {
  if (!(await requireAdmin(supabase))) {
    return { ok: false, message: "Sign in to manage images." };
  }
  const { error } = await supabase.storage.from(PROFILE_ASSETS_BUCKET).remove([path]);
  if (error) {
    return { ok: false, message: "Could not remove the old image." };
  }
  return { ok: true };
}

/** Public URL for rendering a stored asset (bucket is public). */
export function publicAssetUrl(supabase: StorageDb, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(PROFILE_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
