import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sharp from "sharp";
import {
  IMAGE_TOO_SMALL_MESSAGE,
  optimizeCatalogImage,
  UNPROCESSABLE_IMAGE_MESSAGE,
} from "./optimize";

/** Solid-color fixture in the requested format/dimensions. */
async function fixture(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp",
  options?: { alpha?: boolean; orientation?: number },
): Promise<Buffer> {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: options?.alpha ? 4 : 3,
      background: options?.alpha
        ? { r: 20, g: 120, b: 200, alpha: 0.5 }
        : { r: 20, g: 120, b: 200 },
    },
  });
  if (options?.orientation) {
    pipeline = pipeline.withMetadata({ orientation: options.orientation });
  }
  if (format === "jpeg") return pipeline.jpeg({ quality: 90 }).toBuffer();
  if (format === "png") return pipeline.png().toBuffer();
  return pipeline.webp({ quality: 90 }).toBuffer();
}

async function outputMeta(bytes: Buffer) {
  return sharp(bytes).metadata();
}

describe("catalog image optimization — formats", () => {
  it("converts JPEG to WebP", async () => {
    const result = await optimizeCatalogImage(await fixture(1600, 1200, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contentType).toBe("image/webp");
    expect(result.bytes.subarray(0, 4).toString()).toBe("RIFF");
    expect(result.bytes.subarray(8, 12).toString()).toBe("WEBP");
  });

  it("converts PNG to WebP", async () => {
    const result = await optimizeCatalogImage(await fixture(1200, 900, "png"), "GALLERY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await outputMeta(result.bytes)).format).toBe("webp");
  });

  it("normalizes WebP to WebP", async () => {
    const result = await optimizeCatalogImage(await fixture(1200, 900, "webp"), "CARD_PREVIEW");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await outputMeta(result.bytes)).format).toBe("webp");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it("rejects invalid bytes without throwing", async () => {
    const result = await optimizeCatalogImage(
      new Uint8Array(Buffer.from("not an image at all")),
      "PRIMARY",
    );
    expect(result).toEqual({ ok: false, message: UNPROCESSABLE_IMAGE_MESSAGE });
  });

  it("rejects truncated image data without throwing", async () => {
    const full = await fixture(1200, 900, "jpeg");
    const result = await optimizeCatalogImage(new Uint8Array(full.subarray(0, 200)), "PRIMARY");
    expect(result.ok).toBe(false);
  });
});

describe("catalog image optimization — dimensions and ratio", () => {
  it("accepts exact 1600x1200", async () => {
    const result = await optimizeCatalogImage(await fixture(1600, 1200, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
  });

  it("accepts 1200x900 unchanged (no upscaling)", async () => {
    const result = await optimizeCatalogImage(await fixture(1200, 900, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it("accepts the 800x600 minimum unchanged", async () => {
    const result = await optimizeCatalogImage(await fixture(800, 600, "png"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("resizes 2000x1500 down to the 1600x1200 maximum", async () => {
    const result = await optimizeCatalogImage(await fixture(2000, 1500, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
  });

  it("center-crops 16:9 (1600x900) to 4:3 without distortion", async () => {
    const result = await optimizeCatalogImage(await fixture(1600, 900, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it("center-crops square (1200x1200) to 4:3", async () => {
    const result = await optimizeCatalogImage(await fixture(1200, 1200, "png"), "GALLERY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it("crops portrait (900x1200) safely to 4:3", async () => {
    const result = await optimizeCatalogImage(await fixture(900, 1200, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(900);
    expect(result.height).toBe(675);
    expect(result.width * 3).toBe(result.height * 4);
  });

  it("rejects below-minimum sources with a clear error", async () => {
    const small = await optimizeCatalogImage(await fixture(700, 525, "jpeg"), "PRIMARY");
    expect(small).toEqual({ ok: false, message: IMAGE_TOO_SMALL_MESSAGE });
    const tiny = await optimizeCatalogImage(await fixture(400, 300, "png"), "PRIMARY");
    expect(tiny).toEqual({ ok: false, message: IMAGE_TOO_SMALL_MESSAGE });
  });

  it("rejects extreme source dimensions", async () => {
    const result = await optimizeCatalogImage(await fixture(4100, 3100, "jpeg"), "PRIMARY");
    expect(result.ok).toBe(false);
  });
});

describe("catalog image optimization — output properties", () => {
  it("auto-orients EXIF-rotated phone photos before cropping", async () => {
    // 600x800 stored pixels, orientation 6 (rotate 90°) → 800x600 frame.
    const result = await optimizeCatalogImage(
      await fixture(600, 800, "jpeg", { orientation: 6 }),
      "PRIMARY",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("preserves alpha transparency instead of flattening", async () => {
    const result = await optimizeCatalogImage(
      await fixture(1000, 800, "png", { alpha: true }),
      "PRIMARY",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await outputMeta(result.bytes);
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
  });

  it("strips EXIF metadata from the public asset", async () => {
    const withExif = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .withMetadata({ exif: { IFD0: { Make: "TestCam", Model: "X1" } } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const result = await optimizeCatalogImage(withExif, "PRIMARY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await outputMeta(result.bytes);
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
  });

  it("OG images are optimized without 4:3 cropping", async () => {
    const result = await optimizeCatalogImage(await fixture(1600, 900, "jpeg"), "OG");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await outputMeta(result.bytes)).format).toBe("webp");
    // Fit inside 1200x630: scale 0.7 → 1120x630, shape preserved.
    expect(result.width).toBe(1120);
    expect(result.height).toBe(630);
  });
});
