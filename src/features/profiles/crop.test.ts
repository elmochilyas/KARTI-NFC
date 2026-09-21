import { describe, expect, it } from "vitest";
import {
  AVATAR_CROP_ASPECT,
  COVER_CROP_ASPECT,
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  computeSourceRect,
  coverScale,
  initialCropState,
  maxPanOffset,
  panCrop,
  resetCrop,
  zoomCrop,
} from "./crop";

describe("crop constants", () => {
  it("zooms 1x–3x with a square avatar and 3:1 cover frame", () => {
    expect(CROP_ZOOM_MIN).toBe(1);
    expect(CROP_ZOOM_MAX).toBe(3);
    expect(AVATAR_CROP_ASPECT).toBe(1);
    expect(COVER_CROP_ASPECT).toBe(3);
  });
});

describe("initialCropState", () => {
  it("starts centered at 1x", () => {
    expect(initialCropState(800, 600, 1)).toEqual({
      imgWidth: 800,
      imgHeight: 600,
      aspect: 1,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("rejects invalid dimensions", () => {
    expect(() => initialCropState(0, 600, 1)).toThrow();
    expect(() => initialCropState(800, -1, 1)).toThrow();
    expect(() => initialCropState(800, 600, 0)).toThrow();
    expect(() => initialCropState(NaN, 600, 1)).toThrow();
  });
});

describe("coverScale / maxPanOffset", () => {
  it("covers the frame on the limiting axis", () => {
    // Landscape 800×600 in a 300×300 frame: height limits.
    expect(coverScale(800, 600, 300, 300)).toBe(0.5);
    // Portrait 600×800: width limits.
    expect(coverScale(600, 800, 300, 300)).toBe(0.5);
  });

  it("allows no pan when the rendered image matches the frame", () => {
    expect(maxPanOffset(300, 300)).toBe(0);
    expect(maxPanOffset(200, 300)).toBe(0);
    expect(maxPanOffset(400, 300)).toBe(50);
  });
});

describe("zoomCrop", () => {
  it("clamps to 1x–3x and keeps non-finite input at 1x", () => {
    const state = initialCropState(800, 600, 1);
    expect(zoomCrop(state, 2, 300, 300).zoom).toBe(2);
    expect(zoomCrop(state, 99, 300, 300).zoom).toBe(3);
    expect(zoomCrop(state, 0.2, 300, 300).zoom).toBe(1);
    expect(zoomCrop(state, NaN, 300, 300).zoom).toBe(1);
  });

  it("re-clamps pan offsets that exceed the new zoom bounds", () => {
    const state = initialCropState(800, 600, 1);
    const zoomed = zoomCrop(state, 3, 300, 300);
    const panned = panCrop(zoomed, 500, 0, 300, 300);
    // At 3x the rendered width is 1200px in a 300px frame: max ±450.
    expect(panned.offsetX).toBe(450);
    const backOut = zoomCrop(panned, 1, 300, 300);
    // At 1x the rendered width is 400px: max ±50.
    expect(backOut.offsetX).toBe(50);
  });
});

describe("panCrop", () => {
  it("clamps panning so the frame stays fully covered", () => {
    const state = initialCropState(800, 600, 1);
    expect(panCrop(state, 1000, 0, 300, 300).offsetX).toBe(50);
    expect(panCrop(state, -1000, 0, 300, 300).offsetX).toBe(-50);
    // Rendered height (300) matches the frame: vertical pan is locked.
    expect(panCrop(state, 0, 1000, 300, 300).offsetY).toBe(0);
  });

  it("rejects non-finite deltas", () => {
    const state = initialCropState(800, 600, 1);
    expect(() => panCrop(state, NaN, 0, 300, 300)).toThrow();
  });
});

describe("resetCrop", () => {
  it("returns to centered 1x", () => {
    const state = panCrop(zoomCrop(initialCropState(800, 600, 1), 2.5, 300, 300), 40, 0, 300, 300);
    expect(resetCrop(state)).toMatchObject({ zoom: 1, offsetX: 0, offsetY: 0 });
  });
});

describe("computeSourceRect", () => {
  it("takes the center square of a landscape avatar source", () => {
    const rect = computeSourceRect(initialCropState(800, 600, 1), 300, 300);
    expect(rect).toEqual({ sx: 100, sy: 0, sw: 600, sh: 600 });
  });

  it("takes the center square of a portrait avatar source", () => {
    const rect = computeSourceRect(initialCropState(600, 800, 1), 300, 300);
    expect(rect).toEqual({ sx: 0, sy: 100, sw: 600, sh: 600 });
  });

  it("zooms into the center and follows the pan", () => {
    const state = initialCropState(800, 600, 1);
    const zoomed = computeSourceRect(zoomCrop(state, 2, 300, 300), 300, 300);
    expect(zoomed).toEqual({ sx: 250, sy: 150, sw: 300, sh: 300 });
    const panned = computeSourceRect(
      panCrop(zoomCrop(state, 2, 300, 300), 50, 0, 300, 300),
      300,
      300,
    );
    expect(panned.sx).toBe(200);
    expect(panned.sw).toBe(300);
  });

  it("keeps the rect inside the source at extreme pans", () => {
    const state = initialCropState(800, 600, 1);
    const rect = computeSourceRect(panCrop(state, 1000, 1000, 300, 300), 300, 300);
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(800);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(600);
  });

  it("keeps the 3:1 cover ratio from a wide source", () => {
    const rect = computeSourceRect(initialCropState(1200, 800, 3), 360, 120);
    expect(rect.sw / rect.sh).toBeCloseTo(3, 5);
    expect(rect).toEqual({ sx: 0, sy: 200, sw: 1200, sh: 400 });
  });
});
