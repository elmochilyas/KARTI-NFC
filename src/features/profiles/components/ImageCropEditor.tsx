"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AVATAR_CROP_ASPECT,
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  COVER_CROP_ASPECT,
  computeSourceRect,
  coverScale,
  initialCropState,
  panCrop,
  resetCrop,
  zoomCrop,
  type CropState,
} from "@/features/profiles/crop";
import {
  IMAGE_QUALITY,
  cropBitmapToWebP,
  decodeImageFile,
  maxDimForKind,
} from "@/features/profiles/image";

/**
 * Image adjustment editor: drag to reposition, slider to zoom, live
 * WYSIWYG preview cropped exactly like the public profile (circle for
 * avatars, wide rectangle for covers). Rendered in a native `<dialog>`
 * (top-layer, free Esc-to-cancel, no dependency).
 *
 * The parent mounts this only after file select and unmounts on
 * cancel/confirm. Confirm produces a cropped WebP `File` for the existing
 * upload action — the original bytes are never uploaded.
 */

const AVATAR_FRAME = 260;
const COVER_FRAME_W = 320;
const COVER_FRAME_H = 107;
const AVATAR_PREVIEW = 80;
const COVER_PREVIEW_W = 216;
const COVER_PREVIEW_H = 72;
const KEY_PAN_PX = 12;

function nominalFrame(kind: "avatar" | "cover"): { w: number; h: number } {
  return kind === "avatar"
    ? { w: AVATAR_FRAME, h: AVATAR_FRAME }
    : { w: COVER_FRAME_W, h: COVER_FRAME_H };
}

function renderBox(
  state: CropState,
  frameW: number,
  frameH: number,
): { width: number; height: number; left: number; top: number } {
  const scale = coverScale(state.imgWidth, state.imgHeight, frameW, frameH) * state.zoom;
  const width = state.imgWidth * scale;
  const height = state.imgHeight * scale;
  return {
    width,
    height,
    left: (frameW - width) / 2 + state.offsetX,
    top: (frameH - height) / 2 + state.offsetY,
  };
}

export function ImageCropEditor({
  file,
  sourceUrl,
  kind,
  onConfirm,
  onCancel,
}: {
  file: File;
  sourceUrl: string;
  kind: "avatar" | "cover";
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}) {
  const isAvatar = kind === "avatar";
  const aspect = isAvatar ? AVATAR_CROP_ASPECT : COVER_CROP_ASPECT;
  const titleId = useId();
  const descId = useId();
  const zoomId = useId();
  const frameHelpId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const [frame, setFrame] = useState(nominalFrame(kind));
  const [crop, setCrop] = useState<CropState | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const title = isAvatar ? "Adjust profile photo" : "Adjust cover image";
  const confirmLabel = isAvatar ? "Use this photo" : "Use this cover";
  const previewHeading = isAvatar
    ? "How your profile photo will appear"
    : "How your cover will appear";

  // Top-layer dialog + Esc-to-cancel. StrictMode-safe: showModal is guarded.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // showModal unsupported — the dialog still renders inline.
      }
    }
    const onDialogCancel = () => onCancelRef.current();
    dialog.addEventListener("cancel", onDialogCancel);
    return () => {
      dialog.removeEventListener("cancel", onDialogCancel);
      if (dialog.open) dialog.close();
    };
  }, []);

  // Decode for dimensions (probe) and for the canvas crop (bitmap).
  useEffect(() => {
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (cancelled) return;
      if (probe.naturalWidth <= 0 || probe.naturalHeight <= 0) {
        setFailed(true);
        return;
      }
      setCrop(initialCropState(probe.naturalWidth, probe.naturalHeight, aspect));
    };
    probe.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    probe.src = sourceUrl;
    void (async () => {
      const decoded = await decodeImageFile(file);
      if (cancelled) {
        try {
          decoded?.close();
        } catch {
          // ignore
        }
        return;
      }
      if (!decoded) setFailed(true);
      else setBitmap(decoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [aspect, file, sourceUrl]);

  // Release the decoded bitmap on unmount.
  useEffect(() => {
    return () => {
      try {
        bitmap?.close();
      } catch {
        // ignore
      }
    };
  }, [bitmap]);

  // Measure the real frame so pan math matches rendered pixels.
  // The frame div renders from the first paint, so one setup suffices.
  useEffect(() => {
    const frameEl = frameRef.current;
    if (!frameEl || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = frameEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrame((prev) =>
          Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
            ? prev
            : { w: rect.width, h: rect.height },
        );
      }
    });
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start || !crop) return;
    setCrop(panCrop(crop, e.clientX - start.x, e.clientY - start.y, frame.w, frame.h));
    dragRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onFrameKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!crop) return;
    const step = KEY_PAN_PX;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCrop(panCrop(crop, step, 0, frame.w, frame.h));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setCrop(panCrop(crop, -step, 0, frame.w, frame.h));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCrop(panCrop(crop, 0, step, frame.w, frame.h));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCrop(panCrop(crop, 0, -step, frame.w, frame.h));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setCrop(zoomCrop(crop, crop.zoom + 0.2, frame.w, frame.h));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setCrop(zoomCrop(crop, crop.zoom - 0.2, frame.w, frame.h));
    }
  }

  async function handleConfirm() {
    if (!crop || !bitmap || confirming) return;
    setConfirming(true);
    try {
      const rect = computeSourceRect(crop, frame.w, frame.h);
      const cropped = await cropBitmapToWebP(bitmap, rect, {
        cap: maxDimForKind(kind),
        quality: IMAGE_QUALITY,
        fileName: file.name,
      });
      if (!cropped) {
        setFailed(true);
        return;
      }
      onConfirm(cropped);
    } finally {
      setConfirming(false);
    }
  }

  const box = crop ? renderBox(crop, frame.w, frame.h) : null;
  const previewScale = isAvatar ? AVATAR_PREVIEW / frame.w : COVER_PREVIEW_W / frame.w;
  const ready = crop !== null && bitmap !== null && !failed;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto max-h-[90dvh] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <p id={descId} className="mt-1 text-sm text-muted">
            Drag to reposition · use the slider to zoom.
          </p>
        </div>

        {failed ? (
          <p role="alert" className="text-sm font-medium text-danger">
            Couldn&apos;t read that image. Try a different photo.
          </p>
        ) : null}

        {/* Adjustment frame — same crop shape as the public profile. */}
        <div className="flex justify-center">
          <div
            ref={frameRef}
            tabIndex={ready ? 0 : -1}
            role="img"
            aria-label={
              isAvatar
                ? "Profile photo position. Drag or use arrow keys to move, plus and minus to zoom."
                : "Cover image position. Drag or use arrow keys to move, plus and minus to zoom."
            }
            aria-describedby={frameHelpId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onFrameKeyDown}
            className={`relative w-full touch-none overflow-hidden bg-surface-muted select-none ${
              isAvatar ? "aspect-square max-w-[260px] rounded-full" : "aspect-[3/1] rounded-xl"
            } ${crop ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {box ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourceUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute"
                style={{
                  width: box.width,
                  height: box.height,
                  left: box.left,
                  top: box.top,
                  maxWidth: "none",
                }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
                />
              </span>
            )}
          </div>
        </div>
        <p id={frameHelpId} className="sr-only">
          Arrow keys move the photo. Plus enlarges, minus shrinks.
        </p>

        {/* Zoom */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={zoomId} className="text-sm font-medium">
              Zoom
            </label>
            <output htmlFor={zoomId} className="text-sm font-semibold text-muted">
              {(crop?.zoom ?? 1).toFixed(1)}x
            </output>
          </div>
          <input
            id={zoomId}
            type="range"
            min={CROP_ZOOM_MIN}
            max={CROP_ZOOM_MAX}
            step={0.1}
            value={crop?.zoom ?? CROP_ZOOM_MIN}
            disabled={!ready}
            onChange={(e) =>
              setCrop((prev) => (prev ? zoomCrop(prev, Number(e.target.value), frame.w, frame.h) : prev))
            }
            className="h-11 w-full accent-[var(--color-accent)]"
          />
        </div>

        {/* WYSIWYG preview */}
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3">
          <p className="text-sm font-semibold">{previewHeading}</p>
          <span
            aria-hidden="true"
            className={`relative block overflow-hidden ${
              isAvatar ? "rounded-full" : "rounded-lg"
            }`}
            style={
              isAvatar
                ? { width: AVATAR_PREVIEW, height: AVATAR_PREVIEW }
                : { width: COVER_PREVIEW_W, height: COVER_PREVIEW_H }
            }
          >
            {box ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourceUrl}
                alt=""
                draggable={false}
                className="absolute"
                style={{
                  width: box.width * previewScale,
                  height: box.height * previewScale,
                  left: box.left * previewScale,
                  top: box.top * previewScale,
                  maxWidth: "none",
                }}
              />
            ) : null}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!ready || confirming}
            loading={confirming}
            aria-label={confirmLabel}
          >
            {confirming ? "Preparing…" : confirmLabel}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCrop((prev) => (prev ? resetCrop(prev) : prev))}
              disabled={!ready || confirming}
              aria-label="Reset adjustments"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={confirming}
              aria-label="Cancel, keep current image"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
