import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOG_UPLOAD_MAX_INPUT_BYTES,
  CATALOG_UPLOAD_MAX_OUTPUT_BYTES,
  CATALOG_UPLOAD_TARGET_BYTES,
  UNSUPPORTED_UPLOAD_TYPE_MESSAGE,
  UPLOAD_PROCESSING_FAILED_MESSAGE,
  UPLOAD_STILL_TOO_LARGE_MESSAGE,
  UPLOAD_TOO_LARGE_MESSAGE,
  catalogEncodePlan,
  isAcceptedUploadType,
  preprocessCatalogImageFile,
  type CatalogCanvas,
} from "./preprocess";

afterEach(() => {
  vi.unstubAllGlobals();
});

function fileOf(name: string, type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function bitmapOf(width: number, height: number): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

function canvasFactory(
  sizeFor: (width: number, height: number, quality: number) => number,
  record?: Array<{ width: number; height: number; quality: number }>,
): () => CatalogCanvas {
  return () => {
    const canvas: CatalogCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((cb, type, quality) => {
        record?.push({ width: canvas.width, height: canvas.height, quality: quality ?? 0 });
        cb(new Blob([new Uint8Array(sizeFor(canvas.width, canvas.height, quality ?? 0))], { type }));
      }),
    };
    return canvas;
  };
}

const proportional = (w: number, h: number, q: number) => Math.round(w * h * q * 0.7);

describe("catalog encode plan", () => {
  it("tries full resolution first and never grows dimensions", () => {
    const plan = catalogEncodePlan();
    expect(plan[0]).toEqual({ maxDim: 1600, quality: 0.85 });
    for (let i = 1; i < plan.length; i += 1) {
      expect(plan[i].maxDim).toBeLessThanOrEqual(plan[i - 1].maxDim);
    }
    for (const step of plan) {
      expect(step.quality).toBeGreaterThan(0);
      expect(step.quality).toBeLessThanOrEqual(1);
    }
  });
});

describe("isAcceptedUploadType", () => {
  it("allows JPEG, PNG, and WebP only", () => {
    expect(isAcceptedUploadType("image/jpeg")).toBe(true);
    expect(isAcceptedUploadType("image/png")).toBe(true);
    expect(isAcceptedUploadType("image/webp")).toBe(true);
    expect(isAcceptedUploadType("image/gif")).toBe(false);
    expect(isAcceptedUploadType("image/svg+xml")).toBe(false);
    expect(isAcceptedUploadType("")).toBe(false);
  });
});

describe("preprocessCatalogImageFile", () => {
  it("rejects an unsupported type with a friendly message", async () => {
    const decode = vi.fn();
    const result = await preprocessCatalogImageFile(fileOf("anim.gif", "image/gif"), { decode });
    expect(result).toEqual({ ok: false, message: UNSUPPORTED_UPLOAD_TYPE_MESSAGE });
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects a file over the 5 MB input cap before decoding", async () => {
    const decode = vi.fn();
    const result = await preprocessCatalogImageFile(
      fileOf("huge.png", "image/png", CATALOG_UPLOAD_MAX_INPUT_BYTES + 1),
      { decode },
    );
    expect(result).toEqual({ ok: false, message: UPLOAD_TOO_LARGE_MESSAGE });
    expect(decode).not.toHaveBeenCalled();
  });

  it("downscales a large image until it fits the transport target", async () => {
    const record: Array<{ width: number; height: number; quality: number }> = [];
    const result = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => bitmapOf(3000, 2000),
      canvasFactory: canvasFactory(proportional, record),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name).toBe("photo.webp");
    expect(result.file.size).toBeGreaterThan(0);
    expect(result.file.size).toBeLessThanOrEqual(CATALOG_UPLOAD_TARGET_BYTES);
    expect(record[0]).toMatchObject({ width: 1600, height: 1067, quality: 0.85 });
    const last = record[record.length - 1];
    expect(last.width / last.height).toBeCloseTo(1.5, 2);
  });

  it("does not upscale a small image and returns the first fitting encode", async () => {
    const record: Array<{ width: number; height: number; quality: number }> = [];
    const result = await preprocessCatalogImageFile(fileOf("small.jpg", "image/jpeg"), {
      decode: async () => bitmapOf(400, 300),
      canvasFactory: canvasFactory(proportional, record),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(record).toHaveLength(1);
    expect(record[0]).toMatchObject({ width: 400, height: 300 });
    expect(record.every((c) => c.width <= 400 && c.height <= 300)).toBe(true);
  });

  it("returns the smallest result when the target is missed but the ceiling is not", async () => {
    const between = Math.round((CATALOG_UPLOAD_TARGET_BYTES + CATALOG_UPLOAD_MAX_OUTPUT_BYTES) / 2);
    const result = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => bitmapOf(3000, 2000),
      canvasFactory: canvasFactory(() => between),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.size).toBe(between);
  });

  it("errors instead of submitting when even the smallest result is too large", async () => {
    const result = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => bitmapOf(3000, 2000),
      canvasFactory: canvasFactory(() => CATALOG_UPLOAD_MAX_OUTPUT_BYTES + 1),
    });
    expect(result).toEqual({ ok: false, message: UPLOAD_STILL_TOO_LARGE_MESSAGE });
  });

  it("surfaces a friendly error when decoding fails", async () => {
    const nullResult = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => null,
      canvasFactory: canvasFactory(proportional),
    });
    expect(nullResult).toEqual({ ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE });

    const throwResult = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => {
        throw new Error("heic unsupported");
      },
      canvasFactory: canvasFactory(proportional),
    });
    expect(throwResult).toEqual({ ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE });
  });

  it("surfaces a friendly error when the canvas step is unavailable", async () => {
    const result = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"), {
      decode: async () => bitmapOf(2000, 1500),
      canvasFactory: () => null,
    });
    expect(result).toEqual({ ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE });
  });

  it("fails gracefully with browser APIs missing (server/Node)", async () => {
    expect(typeof globalThis.createImageBitmap).not.toBe("function");
    const result = await preprocessCatalogImageFile(fileOf("photo.png", "image/png"));
    expect(result).toEqual({ ok: false, message: UPLOAD_PROCESSING_FAILED_MESSAGE });
  });
});
