import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AVATAR_MAX_DIM,
  COVER_MAX_DIM,
  IMAGE_QUALITY,
  isBrowserResizeAvailable,
  maxDimForKind,
  resizeImageToWebP,
  targetDimensions,
} from "./image";

afterEach(() => {
  vi.unstubAllGlobals();
});

function installBrowserMocks(srcWidth: number, srcHeight: number) {
  const drawImage = vi.fn();
  const close = vi.fn();
  let capturedCanvas: { width: number; height: number } | null = null;

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: srcWidth, height: srcHeight, close })),
  );

  const fakeDocument = {
    createElement: vi.fn(() => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({ drawImage })),
        toBlob: vi.fn(
          (cb: (b: Blob | null) => void, type: string, quality?: number) => {
            expect(type).toBe("image/webp");
            expect(quality).toBe(IMAGE_QUALITY);
            capturedCanvas = { width: canvas.width, height: canvas.height };
            cb(new Blob(["webp-bytes"], { type: "image/webp" }));
          },
        ),
      };
      return canvas;
    }),
  };
  vi.stubGlobal("document", fakeDocument);
  return {
    drawImage,
    close,
    capturedCanvas: () => capturedCanvas,
  };
}

describe("image caps", () => {
  it("uses 512px for avatars and 1600px for covers at quality 0.82", () => {
    expect(AVATAR_MAX_DIM).toBe(512);
    expect(COVER_MAX_DIM).toBe(1600);
    expect(maxDimForKind("avatar")).toBe(512);
    expect(maxDimForKind("cover")).toBe(1600);
    expect(IMAGE_QUALITY).toBe(0.82);
  });

  it("fits large images inside the cap preserving aspect ratio", () => {
    expect(targetDimensions(2000, 1000, 512)).toEqual({ width: 512, height: 256 });
    expect(targetDimensions(1000, 2000, 512)).toEqual({ width: 256, height: 512 });
    expect(targetDimensions(3000, 2000, 1600)).toEqual({ width: 1600, height: 1067 });
  });

  it("never upscales small files", () => {
    expect(targetDimensions(100, 80, 512)).toEqual({ width: 100, height: 80 });
    expect(targetDimensions(512, 512, 512)).toEqual({ width: 512, height: 512 });
  });
});

describe("resizeImageToWebP", () => {
  it("falls back to the original file when browser APIs are missing", async () => {
    expect(isBrowserResizeAvailable()).toBe(false);
    const file = new File(["hello"], "photo.png", { type: "image/png" });
    await expect(resizeImageToWebP(file, { maxDim: 512, quality: IMAGE_QUALITY })).resolves.toBe(
      file,
    );
  });

  it("downscales to the avatar cap and outputs WebP", async () => {
    const mocks = installBrowserMocks(1024, 512);
    expect(isBrowserResizeAvailable()).toBe(true);
    const file = new File(["orig"], "photo.png", { type: "image/png" });
    const out = await resizeImageToWebP(file, { maxDim: 512, quality: IMAGE_QUALITY });
    expect(out.type).toBe("image/webp");
    expect(out.name).toBe("photo.webp");
    expect(mocks.capturedCanvas()).toEqual({ width: 512, height: 256 });
    expect(mocks.drawImage).toHaveBeenCalledOnce();
  });

  it("does not upscale small files but still converts to WebP", async () => {
    const mocks = installBrowserMocks(100, 80);
    const file = new File(["orig"], "small.jpg", { type: "image/jpeg" });
    const out = await resizeImageToWebP(file, { maxDim: 512, quality: IMAGE_QUALITY });
    expect(out.type).toBe("image/webp");
    expect(mocks.capturedCanvas()).toEqual({ width: 100, height: 80 });
  });

  it("returns the original file when decoding fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("decode error");
      }),
    );
    vi.stubGlobal("document", { createElement: vi.fn() });
    const file = new File(["orig"], "photo.png", { type: "image/png" });
    await expect(resizeImageToWebP(file, { maxDim: 512, quality: 0.82 })).resolves.toBe(file);
  });
});
