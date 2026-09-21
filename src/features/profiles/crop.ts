/**
 * Pure crop-transform math for the image adjustment editor.
 *
 * The editor shows the source image cover-fit inside a fixed-aspect frame
 * (1:1 circle for avatars, 3:1 rectangle for covers — the same crop the
 * public profile applies via CSS). The user pans (offsets in frame pixels)
 * and zooms (1x–3x). `computeSourceRect` maps the frame back to source
 * pixels for the canvas crop, so the preview and the upload are identical.
 *
 * No DOM here — fully unit-testable. The canvas step lives in image.ts.
 */

export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 3;

/** Avatar frame is square; cover frame is a wide 3:1 rectangle. */
export const AVATAR_CROP_ASPECT = 1;
export const COVER_CROP_ASPECT = 3;

export type CropState = {
  imgWidth: number;
  imgHeight: number;
  /** frame width / frame height, e.g. 1 for avatars, 3 for covers. */
  aspect: number;
  zoom: number;
  /** Pan offsets in frame pixels; (0, 0) is centered. */
  offsetX: number;
  offsetY: number;
};

export type SourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

function assertPositive(...values: number[]): void {
  for (const value of values) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Invalid crop dimensions.");
    }
  }
}

/** Fresh centered state for a decoded source image. */
export function initialCropState(
  imgWidth: number,
  imgHeight: number,
  aspect: number,
): CropState {
  assertPositive(imgWidth, imgHeight, aspect);
  return { imgWidth, imgHeight, aspect, zoom: CROP_ZOOM_MIN, offsetX: 0, offsetY: 0 };
}

/** Cover-fit scale: the factor that makes the source cover the frame. */
export function coverScale(
  imgWidth: number,
  imgHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  assertPositive(imgWidth, imgHeight, frameWidth, frameHeight);
  return Math.max(frameWidth / imgWidth, frameHeight / imgHeight);
}

/** Largest legal pan offset on one axis (rendered length vs frame length). */
export function maxPanOffset(renderedLength: number, frameLength: number): number {
  if (!Number.isFinite(renderedLength) || !Number.isFinite(frameLength)) {
    throw new Error("Invalid crop dimensions.");
  }
  return Math.max(0, (renderedLength - frameLength) / 2);
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return CROP_ZOOM_MIN;
  return Math.min(CROP_ZOOM_MAX, Math.max(CROP_ZOOM_MIN, zoom));
}

function clampOffset(state: CropState, frameWidth: number, frameHeight: number): CropState {
  const scale =
    coverScale(state.imgWidth, state.imgHeight, frameWidth, frameHeight) * state.zoom;
  return {
    ...state,
    offsetX: Math.min(
      maxPanOffset(state.imgWidth * scale, frameWidth),
      Math.max(-maxPanOffset(state.imgWidth * scale, frameWidth), state.offsetX),
    ),
    offsetY: Math.min(
      maxPanOffset(state.imgHeight * scale, frameHeight),
      Math.max(-maxPanOffset(state.imgHeight * scale, frameHeight), state.offsetY),
    ),
  };
}

/** Set the zoom (clamped to 1x–3x) and re-clamp the pan to the new bounds. */
export function zoomCrop(
  state: CropState,
  zoom: number,
  frameWidth: number,
  frameHeight: number,
): CropState {
  assertPositive(frameWidth, frameHeight);
  return clampOffset({ ...state, zoom: clampZoom(zoom) }, frameWidth, frameHeight);
}

/** Pan by frame-pixel deltas, clamped so the frame stays fully covered. */
export function panCrop(
  state: CropState,
  dx: number,
  dy: number,
  frameWidth: number,
  frameHeight: number,
): CropState {
  assertPositive(frameWidth, frameHeight);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw new Error("Invalid crop pan.");
  }
  return clampOffset(
    { ...state, offsetX: state.offsetX + dx, offsetY: state.offsetY + dy },
    frameWidth,
    frameHeight,
  );
}

/** Back to centered 1x. */
export function resetCrop(state: CropState): CropState {
  return { ...state, zoom: CROP_ZOOM_MIN, offsetX: 0, offsetY: 0 };
}

/**
 * Map the frame to source pixels for the canvas crop. The rect always has
 * the frame's aspect ratio and always lies inside the source image.
 */
export function computeSourceRect(
  state: CropState,
  frameWidth: number,
  frameHeight: number,
): SourceRect {
  assertPositive(frameWidth, frameHeight);
  const clamped = clampOffset(state, frameWidth, frameHeight);
  const scale =
    coverScale(clamped.imgWidth, clamped.imgHeight, frameWidth, frameHeight) * clamped.zoom;
  const sw = frameWidth / scale;
  const sh = frameHeight / scale;
  const sx = Math.min(
    Math.max(0, (clamped.imgWidth - sw) / 2 - clamped.offsetX / scale),
    Math.max(0, clamped.imgWidth - sw),
  );
  const sy = Math.min(
    Math.max(0, (clamped.imgHeight - sh) / 2 - clamped.offsetY / scale),
    Math.max(0, clamped.imgHeight - sh),
  );
  return { sx, sy, sw, sh };
}

/**
 * Output canvas size for a source rect is `targetDimensions` from image.ts
 * (fit inside the cap, never upscale). Reused — not duplicated here — so
 * the editor preview math and the canvas step can never disagree on size.
 */
