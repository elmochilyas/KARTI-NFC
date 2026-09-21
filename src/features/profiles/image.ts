/**
 * Client-side image resize helper (Track B, layer 1).
 *
 * Pure where possible: `targetDimensions` is fully unit-testable.
 * `resizeImageToWebP` guards all browser APIs so importing this module on
 * the server (or in Node tests) never throws — it falls back to the
 * original file when `createImageBitmap` / `document` are unavailable.
 *
 * The adjustment editor crops via `cropBitmapToWebP`, which deliberately
 * has no original-file fallback: returning null lets the editor show an
 * error instead of uploading uncropped bytes.
 */

export const AVATAR_MAX_DIM = 1024;
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

/** Minimal canvas surface for the crop step; tests inject fakes. */
export type CropCanvas = {
  width: number;
  height: number;
  getContext: (id: string) => { drawImage: (...args: unknown[]) => void } | null;
  toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => void;
};

export type CanvasFactory = () => CropCanvas | null;

function defaultCanvasFactory(): CropCanvas | null {
  try {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return null;
    }
    return document.createElement("canvas") as unknown as CropCanvas;
  } catch {
    return null;
  }
}

/**
 * Decode an image file EXIF-aware (`from-image` keeps phone photos upright).
 * Null when browser APIs are missing or the bytes don't decode (e.g. HEIC
 * on browsers without support) — the editor surfaces an error and keeps
 * the previous image. Exported for unit tests.
 */
export async function decodeImageFile(file: File): Promise<ImageBitmap | null> {
  if (typeof globalThis.createImageBitmap !== "function") return null;
  try {
    return await globalThis.createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

/**
 * Draw a source rect onto a capped canvas and encode to WebP. Returns null
 * when the canvas step is unavailable or fails — the caller must show an
 * error, never the uncropped original. The canvas factory is injectable so
 * Node tests can assert the exact draw without a browser.
 */
export async function cropBitmapToWebP(
  bitmap: ImageBitmap,
  rect: { sx: number; sy: number; sw: number; sh: number },
  opts: { cap: number; quality: number; fileName: string },
  factory: CanvasFactory = defaultCanvasFactory,
): Promise<File | null> {
  let canvas: CropCanvas | null = null;
  try {
    canvas = factory();
  } catch {
    return null;
  }
  if (!canvas) return null;
  let output: { width: number; height: number };
  try {
    output = targetDimensions(rect.sw, rect.sh, opts.cap);
  } catch {
    return null;
  }
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(
      bitmap,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      output.width,
      output.height,
    );
  } catch {
    return null;
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas?.toBlob((b) => resolve(b), "image/webp", opts.quality);
    } catch {
      resolve(null);
    }
  });
  if (!blob) return null;
  return new File([blob], webpFileName(opts.fileName), { type: "image/webp" });
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
