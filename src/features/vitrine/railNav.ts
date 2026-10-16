/**
 * Pure navigation math for the home product rail (`ProductRail.tsx`).
 *
 * Kept outside JSX per CODING_STANDARDS so the RTL/scroll behavior is
 * unit-testable without a DOM. The rail itself stays a thin client island:
 * native scroll + CSS scroll-snap, no carousel dependency.
 */

/** Logical step direction: 1 = toward the next card, -1 = toward the previous. */
export type RailStepDirection = 1 | -1;

export interface RailEdgeState {
  atStart: boolean;
  atEnd: boolean;
  /** 0..1 position of the progress thumb. */
  progress: number;
  /** 0..1 share of the content currently visible (drives thumb width). */
  visible: number;
}

/**
 * One navigation step in CSS pixels, measured from the live cards so it
 * tracks the responsive card widths (82vw mobile / 44vw tablet / 30%
 * desktop). Falls back to 80% of the viewport when card measurement is
 * unavailable (e.g. before first layout).
 */
export function railStepFromWidths(cardWidth: number, gap: number, clientWidth: number): number {
  const measured = cardWidth > 0 ? cardWidth + Math.max(0, gap) : 0;
  if (measured > 0) return Math.max(1, Math.round(measured));
  return Math.max(1, Math.round(clientWidth * 0.8));
}

/**
 * Signed `scrollBy({ left })` delta for a logical step. In RTL locales the
 * next cards sit toward negative `scrollLeft` (Chromium/WebKit behavior, and
 * `Math.abs` normalization in the edge state covers the rest), so the sign
 * flips. Guaranteed non-zero movement — this is the laptop fix: the old
 * `scrollIntoView({ inline: "nearest" })` was a no-op whenever the target
 * card was already partially visible, which made the arrows feel dead.
 */
export function railScrollDelta(direction: RailStepDirection, step: number, rtl: boolean): number {
  const magnitude = Math.abs(step) || 1;
  const sign = direction * (rtl ? -1 : 1);
  return sign * magnitude;
}

/**
 * Edge/disabled + progress state from raw scroll metrics. `scrollLeft` is
 * normalized with `Math.abs` so negative RTL offsets behave like LTR ones.
 */
export function railEdgeState(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  tolerance = 4,
): RailEdgeState {
  const max = Math.max(0, scrollWidth - clientWidth);
  const abs = Math.abs(scrollLeft);
  const atStart = abs < tolerance;
  const atEnd = max - abs < tolerance;
  return {
    atStart,
    atEnd,
    progress: max === 0 ? 1 : Math.min(1, Math.max(0, abs / max)),
    visible: Math.min(1, clientWidth / Math.max(1, scrollWidth)),
  };
}
