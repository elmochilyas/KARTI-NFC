/**
 * Client-side upload preprocessing for Catalog media.
 *
 * The dashboard uploads through a Server Action, and Next.js caps Server
 * Action request bodies (1 MB by default). Raw product photos routinely
 * exceed that, so we downscale + re-encode in the browser before submit. The
 * admin still sees the same form; only the bytes on the wire shrink.
 *
 * Security: this is a UX guard only. The Server Action and
 * `service.uploadCatalogImage` stay the authority — they re-check the MIME
 * allowlist, size, and magic bytes, then re-optimize with sharp. Never trust
 * these client bytes.
 *
 * All browser APIs are guarded so importing this module on the server or in
 * Node tests never throws; when a step is unavailable the caller gets a
 * friendly error instead of uploading unprocessed bytes.
 */

import { decodeImageFile, targetDimensions } from "@/features/profiles/image";

export const CATALOG_UPLOAD_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type CatalogUploadInputType = (typeof CATALOG_UPLOAD_ACCEPTED_TYPES)[number];

/** Value for `<input type="file" accept=...>`. */
export const CATALOG_UPLOAD_ACCEPT = CATALOG_UPLOAD_ACCEPTED_TYPES.join(",");

/** Mirrors the server's hard input cap (`uploadCatalogImage`). */
export const CATALOG_UPLOAD_MAX_INPUT_BYTES = 5 * 1024 * 1024;

/** Aim comfortably below the 1 MB Server Action body limit. */
export const CATALOG_UPLOAD_TARGET_BYTES = 900 * 1024;

/** Absolute ceiling we are willing to put on the wire (multipart overhead fits under 1 MB). */
export const CATALOG_UPLOAD_MAX_OUTPUT_BYTES = 960 * 1024;

/** Long-side cap; matches the server's 1600 × 1200 (4:3) canonical output. */
export const CATALOG_PREPROCESS_MAX_DIM = 1600;

export const UNSUPPORTED_UPLOAD_TYPE_MESSAGE = "Only JPEG, PNG, or WebP images are allowed.";
export const UPLOAD_TOO_LARGE_MESSAGE = "Images must be 5 MB or smaller.";
export const UPLOAD_STILL_TOO_LARGE_MESSAGE =
  "That image is still too large after optimization. Please choose a smaller file.";
export const UPLOAD_PROCESSING_FAILED_MESSAGE =
  "We couldn't prepare that image. Please try a different file.";

export type CatalogEncodeStep = { maxDim: number; quality: number };

/**
 * Ordered encode attempts: prefer full resolution at a high quality, then
 * trade quality (cheap, no detail loss) before ever shrinking below the
 * dimensions the server's 4:3 crop needs.
 */
export function catalogEncodePlan(): CatalogEncodeStep[] {
  return [
    { maxDim: 1600, quality: 0.85 },
    { maxDim: 1600, quality: 0.72 },
    { maxDim: 1440, quality: 0.78 },
    { maxDim: 1280, quality: 0.75 },
    { maxDim: 1024, quality: 0.7 },
  ];
}

export function isAcceptedUploadType(type: string): type is CatalogUploadInputType {
  return (CATALOG_UPLOAD_ACCEPTED_TYPES as readonly string[]).includes(type);
}

export type PreprocessResult = { ok: true; file: File } | { ok: false; message: string };

export type CatalogCanvas = {
  width: number;
  height: number;
  getContext: (id: string) => { drawImage: (...args: unknown[]) => void } | null;
  toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => void;
};

export type CatalogCanvasFactory = () => CatalogCanvas | null;

const ENCODE_MIME_ORDER = ["image/webp", "image/jpeg"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function defaultCanvasFactory(): CatalogCanvas | null {
  try {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return null;
    }
    return document.createElement("canvas") as unknown as CatalogCanvas;
  } catch {
    return null;
  }
}

function closeBitmap(bitmap: { close?: () => void } | null): void {
  try {
    bitmap?.close?.();
  } catch {
    // ignore
  }
}

function processedName(originalName: string, type: string): string {
  const base = originalName.replace(/\.[^.]*$/, "").trim() || "image";
  return `${base}.${EXTENSIONS[type] ?? "webp"}`;
}

async function encodeOnce(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mime: string,
  quality: number,
  factory: CatalogCanvasFactory,
): Promise<Blob | null> {
  let canvas: CatalogCanvas | null = null;
  try {
    canvas = factory();
  } catch {
    return null;
  }
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(bitmap, 0, 0, width, height);
  } catch {
    return null;
  }
  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas?.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

/** First supported format the browser actually honored (WebP, then JPEG). */
async function encodeBest(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
  factory: CatalogCanvasFactory,
): Promise<Blob | null> {
  for (const mime of ENCODE_MIME_ORDER) {
    const blob = await encodeOnce(bitmap, width, height, mime, quality, factory);
    if (blob && blob.size > 0 && blob.type === mime) return blob;
  }
  return null;
}

export type PreprocessDeps = {
  decode?: (file: File) => Promise<ImageBitmap | null>;
  canvasFactory?: CatalogCanvasFactory;
};

/**
 * Validate, decode, and re-encode an admin-selected image so it fits under
 * the transport limit. Never upscales, never crops, and never distorts the
 * aspect ratio. Returns a friendly message on any failure so the UI can show
 * it instead of a generic server error.
 */
export async function preprocessCatalogImageFile(
  file: File,
  deps: PreprocessDeps = {},
): Promise<PreprocessResult> {
  if (!isAcceptedUploadType(file.type)) {
    return { ok: false, message: UNSUPPORTED_UPLOAD_TYPE_MESSAGE };
  }
  if (file.size <= 0) {
    return { ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE };
  }
  if (file.size > CATALOG_UPLOAD_MAX_INPUT_BYTES) {
    return { ok: false, message: UPLOAD_TOO_LARGE_MESSAGE };
  }

  const decode = deps.decode ?? decodeImageFile;
  const canvasFactory = deps.canvasFactory ?? defaultCanvasFactory;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decode(file);
  } catch {
    bitmap = null;
  }
  if (!bitmap || bitmap.width <= 0 || bitmap.height <= 0) {
    closeBitmap(bitmap);
    return { ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE };
  }

  try {
    let smallest: { blob: Blob; type: string } | null = null;
    for (const step of catalogEncodePlan()) {
      const dims = targetDimensions(bitmap.width, bitmap.height, step.maxDim);
      const blob = await encodeBest(bitmap, dims.width, dims.height, step.quality, canvasFactory);
      if (!blob) continue;
      const type = blob.type;
      if (!smallest || blob.size < smallest.blob.size) smallest = { blob, type };
      if (blob.size <= CATALOG_UPLOAD_TARGET_BYTES) {
        return { ok: true, file: new File([blob], processedName(file.name, type), { type }) };
      }
    }
    if (smallest && smallest.blob.size <= CATALOG_UPLOAD_MAX_OUTPUT_BYTES) {
      return {
        ok: true,
        file: new File([smallest.blob], processedName(file.name, smallest.type), {
          type: smallest.type,
        }),
      };
    }
    if (smallest) {
      return { ok: false, message: UPLOAD_STILL_TOO_LARGE_MESSAGE };
    }
    return { ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE };
  } catch {
    return { ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE };
  } finally {
    closeBitmap(bitmap);
  }
}
