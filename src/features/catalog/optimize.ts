import "server-only";

import type { CatalogMediaRole } from "./storagePaths";

/**
 * Catalog product-image optimization pipeline (server-only — sharp must
 * never reach the browser bundle).
 *
 * Standard: every product image is stored as an optimized WebP in a 4:3
 * frame (canonical max 1600x1200). Uploads of any aspect are center-cropped
 * with cover semantics — never stretched. OG-role images are optimized
 * without cropping (they keep their own shape, max 1200x630 inside).
 *
 * Pipeline order: decode → auto-orient (EXIF) → crop → resize → encode.
 * Sharp strips EXIF/XMP/GPS/thumbnails by default (no `withMetadata`),
 * so public assets carry no camera or location data. Alpha is preserved
 * (never flattened).
 */

export const CATALOG_IMAGE_TARGET_WIDTH = 1600;
export const CATALOG_IMAGE_TARGET_HEIGHT = 1200;
export const CATALOG_IMAGE_MIN_WIDTH = 800;
export const CATALOG_IMAGE_MIN_HEIGHT = 600;
export const CATALOG_IMAGE_QUALITY = 83;
/** Decoded-pixel bomb guard (sharp enforces before full decode). */
export const CATALOG_IMAGE_MAX_INPUT_PIXELS = 40_000_000;
/** Hard per-side cap so CPU/memory stay bounded (mirrors profile assets). */
export const CATALOG_IMAGE_MAX_SOURCE_SIDE = 4000;
/** Dedicated OG images keep their shape inside the standard OG frame. */
export const CATALOG_OG_MAX_WIDTH = 1200;
export const CATALOG_OG_MAX_HEIGHT = 630;

export const IMAGE_TOO_SMALL_MESSAGE = "Image is too small. Minimum: 800 × 600 px.";
export const UNSUPPORTED_FORMAT_MESSAGE = "Unsupported format. Use JPEG, PNG or WebP.";
export const UNPROCESSABLE_IMAGE_MESSAGE = "Image could not be processed.";

export type OptimizeCatalogImageResult =
  | {
      ok: true;
      bytes: Buffer;
      width: number;
      height: number;
      contentType: "image/webp";
    }
  | { ok: false; message: string };

type SharpCallable = typeof import("sharp").default;

/** Dynamic sharp loader (kept out of client bundles; mockable in tests). */
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

/**
 * Validate + normalize raw upload bytes into the canonical stored asset.
 * The caller guarantees the bytes already passed the MIME allowlist,
 * size cap, and magic-byte gate (SVG and forged payloads never reach
 * the decoder). No storage or DB writes happen here — pure transform.
 */
export async function optimizeCatalogImage(
  input: Uint8Array,
  role: CatalogMediaRole,
): Promise<OptimizeCatalogImageResult> {
  const sharp = await loadSharp();
  if (!sharp) return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };

  const source = Buffer.from(input);
  let meta: { width?: number; height?: number; orientation?: number };
  try {
    meta = await sharp(source, { limitInputPixels: CATALOG_IMAGE_MAX_INPUT_PIXELS }).metadata();
  } catch {
    return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };
  }

  const rawWidth = meta.width ?? 0;
  const rawHeight = meta.height ?? 0;
  if (rawWidth <= 0 || rawHeight <= 0) {
    return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };
  }
  if (rawWidth > CATALOG_IMAGE_MAX_SOURCE_SIDE || rawHeight > CATALOG_IMAGE_MAX_SOURCE_SIDE) {
    return { ok: false, message: "Images must be 4000px or smaller on each side." };
  }

  // Oriented dimensions: EXIF orientations 5-8 swap the axes. The
  // `.rotate()` step below applies the orientation to pixels.
  const swapsAxes = (meta.orientation ?? 1) >= 5;
  const orientedWidth = swapsAxes ? rawHeight : rawWidth;
  const orientedHeight = swapsAxes ? rawWidth : rawHeight;

  let pipeline = sharp(source, { limitInputPixels: CATALOG_IMAGE_MAX_INPUT_PIXELS }).rotate();

  if (role !== "OG") {
    // Center cover-crop to exactly 4:3 on the oriented frame.
    const cropWidth = Math.min(orientedWidth, Math.floor((orientedHeight * 4) / 3));
    const cropHeight = Math.floor((cropWidth * 3) / 4);
    if (cropWidth < CATALOG_IMAGE_MIN_WIDTH || cropHeight < CATALOG_IMAGE_MIN_HEIGHT) {
      return { ok: false, message: IMAGE_TOO_SMALL_MESSAGE };
    }
    const left = Math.floor((orientedWidth - cropWidth) / 2);
    const top = Math.floor((orientedHeight - cropHeight) / 2);
    pipeline = pipeline.extract({ left, top, width: cropWidth, height: cropHeight });
    // Downscale only — sources at/below target keep their pixels (no
    // blurry upscaling). The crop is exactly 4:3, so `inside` is exact.
    pipeline = pipeline.resize({
      width: CATALOG_IMAGE_TARGET_WIDTH,
      height: CATALOG_IMAGE_TARGET_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    });
  } else {
    pipeline = pipeline.resize({
      width: CATALOG_OG_MAX_WIDTH,
      height: CATALOG_OG_MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let data: Buffer;
  let info: { width?: number; height?: number; format?: string; size?: number };
  try {
    const result = await pipeline.webp({ quality: CATALOG_IMAGE_QUALITY }).toBuffer({
      resolveWithObject: true,
    });
    data = result.data;
    info = result.info;
  } catch {
    return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };
  }

  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (info.format !== "webp" || width <= 0 || height <= 0 || data.byteLength === 0) {
    return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };
  }
  if (role !== "OG") {
    // Stored product media must be exactly 4:3 within the canonical cap.
    if (
      width > CATALOG_IMAGE_TARGET_WIDTH ||
      height > CATALOG_IMAGE_TARGET_HEIGHT ||
      width * 3 !== height * 4
    ) {
      return { ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE };
    }
  }
  return { ok: true, bytes: data, width, height, contentType: "image/webp" };
}
