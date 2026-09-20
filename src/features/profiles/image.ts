/**
 * Client-side image resize helper (Track B, layer 1).
 *
 * Pure where possible: `targetDimensions` is fully unit-testable.
 * `resizeImageToWebP` guards all browser APIs so importing this module on
 * the server (or in Node tests) never throws — it falls back to the
 * original file when `createImageBitmap` / `document` are unavailable.
 */

export const AVATAR_MAX_DIM = 512;
export const COVER_MAX_DIM = 1600;
export const IMAGE_QUALITY = 0.82;
export const MAX_SOURCE_DIM = 4000;

export const IMAGE_CAPS = {
  avatar: AVATAR_MAX_DIM,
  cover: COVER_MAX_DIM,
} as const;

export type ImageAssetKind = keyof typeof IMAGE_CAPS;

export interface ResizeOptions {
  maxDim: number;
  quality: number;
}

export function maxDimForKind(kind: ImageAssetKind): number {
  return IMAGE_CAPS[kind];
}

/**
 * Fit `(srcWidth, srcHeight)` inside a `maxDim` square. Never upscales:
 * images smaller than the cap keep their exact dimensions.
 */
export function targetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(srcWidth) ||
    !Number.isFinite(srcHeight) ||
    !Number.isFinite(maxDim) ||
    srcWidth <= 0 ||
    srcHeight <= 0 ||
    maxDim <= 0
  ) {
    throw new Error("Invalid dimensions.");
  }
  const scale = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
  return {
    width: Math.max(1, Math.round(srcWidth * scale)),
    height: Math.max(1, Math.round(srcHeight * scale)),
  };
}

export function isBrowserResizeAvailable(): boolean {
  return (
    typeof globalThis.createImageBitmap === "function" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  );
}

function webpFileName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "").trim() || "image";
  return `${base}.webp`;
}

/**
 * Decode via `createImageBitmap`, draw scaled onto a canvas, and encode to
 * WebP. Never upscales. Returns the original file when browser APIs are
 * missing or any step fails (upload must never break because of
 * optimization).
 */
export async function resizeImageToWebP(file: File, opts: ResizeOptions): Promise<File> {
  const { maxDim, quality } = opts;
  if (!isBrowserResizeAvailable()) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await globalThis.createImageBitmap(file);
  } catch {
    return file;
  }
  if (!bitmap || bitmap.width <= 0 || bitmap.height <= 0) {
    try {
      bitmap?.close();
    } catch {
      // ignore
    }
    return file;
  }

  try {
    const target = targetDimensions(bitmap.width, bitmap.height, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), "image/webp", quality);
      } catch {
        resolve(null);
      }
    });
    if (!blob) return file;
    return new File([blob], webpFileName(file.name), { type: "image/webp" });
  } catch {
    return file;
  } finally {
    try {
      bitmap.close();
    } catch {
      // ignore
    }
  }
}
