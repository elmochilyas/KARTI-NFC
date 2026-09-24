import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type StorageDb = SupabaseClient<Database>;

// Client-safe URL helpers live in storagePaths (sharp must never reach the
// browser bundle via the dashboard live preview). Re-exported here so all
// existing server imports keep working unchanged.
import { PROFILE_ASSETS_BUCKET, publicAssetPathUrl, storageOrigin } from "./storagePaths";

export { PROFILE_ASSETS_BUCKET, publicAssetPathUrl, storageOrigin };

export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
/** Private CV bucket (Phase 31): never publicly readable, no SELECT policy. */
export const PROFILE_DOCUMENTS_BUCKET = "profile-documents";
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Server-side normalize caps (Track B, layer 2). Mirrors image.ts. */
export const AVATAR_MAX_DIM = 1024;
export const COVER_MAX_DIM = 1600;
/** Item images (menu/catalog) render at card width — avatar cap suffices. */
export const SECTION_IMAGE_MAX_DIM = 1024;
/** Upper bound per side to keep sharp CPU/memory bounded. */
export const MAX_SOURCE_DIM = 4000;
export const WEBP_QUALITY = 82;
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type AssetKind = "avatar" | "cover";

export type AssetResult = { ok: true; path: string } | { ok: false; message: string };

export type DetectedImageKind = "jpg" | "png" | "webp";

/**
 * Detect a PDF from magic bytes (`%PDF-`). Pure — unit-tested. The declared
 * `application/pdf` type is never trusted on its own.
 */
export function detectPdfKind(header: Uint8Array): boolean {
  return (
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

/**
 * Detect the real image kind from magic bytes (first 12 bytes suffice for
 * JPEG/PNG/WebP). Pure — unit-tested. Browser-provided `file.type` is never
 * trusted on its own: a forged type on an HTML/JS payload must not reach
 * the public bucket.
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
 * Managed-object gate for deletes: only server-generated asset paths may be
 * removed (mirrors `assetPath` + the `assetPathField` schema shape, plus
 * `sectionAssetPath` for collection item images). The previous path arrives
 * via FormData or stored settings and must never become an arbitrary
 * bucket-wide delete.
 */
export function isManagedAssetPath(path: string): boolean {
  return (
    /^profiles\/([0-9a-f-]{1,64}|pending)\/(avatar|cover)\/[0-9a-f]{16}\.(jpg|png|webp)$/.test(
      path,
    ) || isManagedSectionImagePath(path)
  );
}

/**
 * Section-image gate: `{clientId}/sections/{sectionType}/{16hex}.{ext}`.
 * Client ids are UUIDs; section types are registry slugs (shape-checked,
 * not allowlisted here — the settings schemas own the type allowlist).
 */
export function isManagedSectionImagePath(path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sections\/[a-z_]{1,32}\/[0-9a-f]{16}\.(jpg|png|webp)$/.test(
    path,
  );
}

/**
 * Document gate: `{clientId}/sections/{sectionType}/{16hex}.pdf` in the
 * private documents bucket. Same UUID/slug discipline as section images.
 */
export function isManagedDocumentPath(path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sections\/[a-z_]{1,32}\/[0-9a-f]{16}\.pdf$/.test(
    path,
  );
}

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

type SharpCallable = typeof import("sharp").default;

/**
 * Best-effort sharp loader. Returns null when sharp is unavailable so the
 * caller can fall back to storing the original (still magic-byte-checked)
 * file instead of failing the upload outright.
 */
async function loadSharp(): Promise<SharpCallable | null> {
  try {
    const mod = await import("sharp");
    const candidate =
      (mod as unknown as { default?: unknown }).default ??
      (mod as unknown as { sharp?: unknown }).sharp ??
      mod;
    return typeof candidate === "function" ? (candidate as SharpCallable) : null;
  } catch {
    return null;
  }
}

/** Safe generated path — never trusts client filenames. */
export function assetPath(profileId: string, kind: AssetKind, extension: string): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  return `profiles/${profileId}/${kind}/${suffix}.${extension}`;
}

/**
 * Section-scoped generated path (Phase 29): collection item images live
 * under `{clientId}/sections/{sectionType}/`, separate from identity
 * assets. Server-generated names only — never client filenames.
 */
export function sectionAssetPath(clientId: string, sectionType: string, extension: string): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${clientId}/sections/${sectionType}/${suffix}.${extension}`;
}

type FileCheck = { ok: true; extension: string } | { ok: false; message: string };

/** Shared upload preflight: MIME allowlist, size, magic-byte content match. */
async function checkImageFile(file: File): Promise<FileCheck> {
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
  // Magic-byte check: the declared type must match the actual content.
  // Reads only the 12-byte header — no full-file buffering, no new dependency.
  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  } catch {
    return { ok: false, message: "Could not read the image. Please try again." };
  }
  if (detectImageKind(header) !== extension) {
    return { ok: false, message: "That file is not a valid JPEG, PNG, or WebP image." };
  }
  return { ok: true, extension };
}

type NormalizedImage =
  | { ok: true; bytes: Uint8Array | Buffer; contentType: string; extension: string }
  | { ok: false; message: string };

/**
 * Shared normalize: resize inside the cap, convert to WebP, immutable-ready.
 * Sharp is optional at runtime — when unavailable we fall back to the
 * original (already type + magic-byte checked) bytes.
 */
async function normalizeImage(
  file: File,
  extension: string,
  cap: number,
): Promise<NormalizedImage> {
  const sharp = await loadSharp();
  if (sharp) {
    let input: Buffer;
    try {
      input = Buffer.from(await file.arrayBuffer());
    } catch {
      return { ok: false, message: "Could not read the image. Please try again." };
    }
    let meta: { width?: number; height?: number };
    try {
      meta = await sharp(input).metadata();
    } catch {
      return { ok: false, message: "That file is not a valid JPEG, PNG, or WebP image." };
    }
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width <= 0 || height <= 0) {
      return { ok: false, message: "That file is not a valid JPEG, PNG, or WebP image." };
    }
    if (width > MAX_SOURCE_DIM || height > MAX_SOURCE_DIM) {
      return { ok: false, message: "Images must be 4000px or smaller on each side." };
    }
    let output: Buffer;
    try {
      output = await sharp(input)
        .resize({ width: cap, height: cap, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      return { ok: false, message: "Could not process the image. Please try again." };
    }
    if (output.byteLength === 0 || output.byteLength > MAX_ASSET_BYTES) {
      return { ok: false, message: "Images must be 5 MB or smaller." };
    }
    return { ok: true, bytes: output, contentType: "image/webp", extension: "webp" };
  }
  return {
    ok: true,
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
    extension,
  };
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
  const checked = await checkImageFile(file);
  if (!checked.ok) return checked;

  // Server-side normalize (Track B, layer 2): resize inside the kind cap,
  // convert to WebP, store with an immutable cache header.
  const cap = kind === "avatar" ? AVATAR_MAX_DIM : COVER_MAX_DIM;
  const normalized = await normalizeImage(file, checked.extension, cap);
  if (!normalized.ok) return normalized;
  const path =
    normalized.extension === "webp" && normalized.contentType === "image/webp"
      ? assetPath(profileId, kind, "webp")
      : assetPath(profileId, kind, checked.extension);
  const { error } = await supabase.storage
    .from(PROFILE_ASSETS_BUCKET)
    .upload(path, normalized.bytes as BodyInit, {
      contentType: normalized.contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      upsert: false,
    });

  if (error) {
    return { ok: false, message: "Upload failed. Please try again." };
  }
  return { ok: true, path };
}

/**
 * Upload a collection item image (Phase 29). Same validation + normalize
 * pipeline as identity assets, stored under the section-scoped path
 * `{clientId}/sections/{sectionType}/`. Ownership-verified: the profile
 * must belong to the route's client (URL/path never trusted). RLS remains
 * the enforcement layer; the public bucket read posture is unchanged.
 */
export async function uploadSectionImage(
  clientId: string,
  profileId: string,
  sectionType: string,
  file: File,
  supabase: StorageDb,
): Promise<AssetResult> {
  if (!(await requireAdmin(supabase))) {
    return { ok: false, message: "Sign in to upload images." };
  }
  if (!/^[a-z_]{1,32}$/.test(sectionType)) {
    return { ok: false, message: "Invalid section type." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) {
    return { ok: false, message: "Profile not found." };
  }
  const checked = await checkImageFile(file);
  if (!checked.ok) return checked;

  const normalized = await normalizeImage(file, checked.extension, SECTION_IMAGE_MAX_DIM);
  if (!normalized.ok) return normalized;
  const extension =
    normalized.extension === "webp" && normalized.contentType === "image/webp"
      ? "webp"
      : checked.extension;
  const path = sectionAssetPath(clientId, sectionType, extension);
  const { error } = await supabase.storage
    .from(PROFILE_ASSETS_BUCKET)
    .upload(path, normalized.bytes as BodyInit, {
      contentType: normalized.contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      upsert: false,
    });
  if (error) {
    return { ok: false, message: "Upload failed. Please try again." };
  }
  return { ok: true, path };
}

/** Safe generated document path — never trusts client filenames. */
export function documentAssetPath(clientId: string, sectionType: string): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${clientId}/sections/${sectionType}/${suffix}.pdf`;
}

/**
 * Upload a section document (Phase 31: CV PDFs). Stored ORIGINAL (no image
 * pipeline — sharp never touches PDFs) in the private documents bucket.
 * Validated: admin session, ownership (profile belongs to the client),
 * section-type shape, `application/pdf` MIME, 5 MB cap, `%PDF-` magic
 * bytes. RLS remains the enforcement layer.
 */
export async function uploadDocument(
  clientId: string,
  profileId: string,
  sectionType: string,
  file: File,
  supabase: StorageDb,
): Promise<AssetResult> {
  if (!(await requireAdmin(supabase))) {
    return { ok: false, message: "Sign in to upload documents." };
  }
  if (!/^[a-z_]{1,32}$/.test(sectionType)) {
    return { ok: false, message: "Invalid section type." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) {
    return { ok: false, message: "Profile not found." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, message: "Only PDF documents are allowed." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, message: "Documents must be 5 MB or smaller." };
  }
  if (file.size === 0) {
    return { ok: false, message: "The selected file is empty." };
  }
  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  } catch {
    return { ok: false, message: "Could not read the document. Please try again." };
  }
  if (!detectPdfKind(header)) {
    return { ok: false, message: "That file is not a valid PDF document." };
  }
  const path = documentAssetPath(clientId, sectionType);
  const { error } = await supabase.storage.from(PROFILE_DOCUMENTS_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    cacheControl: "no-store",
    upsert: false,
  });
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
  if (!isManagedAssetPath(path) && !isManagedDocumentPath(path)) {
    return { ok: false, message: "Invalid file reference." };
  }
  // Documents live in the private bucket; everything else in profile-assets.
  const bucket = isManagedDocumentPath(path) ? PROFILE_DOCUMENTS_BUCKET : PROFILE_ASSETS_BUCKET;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    return { ok: false, message: "Could not remove the old file." };
  }
  return { ok: true };
}

/** Public URL for rendering a stored asset (bucket is public). */
export function publicAssetUrl(supabase: StorageDb, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(PROFILE_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
