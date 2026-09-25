/**
 * Manual map-pin helpers (Phase 34.7). Pure and client-safe: no Leaflet,
 * no DOM, no fetch. The interactive `MapPinPicker` component handles the
 * map itself; everything here is unit-testable under node.
 *
 * A manually picked pin is persisted like an auto-detected one
 * (`latitude` / `longitude`) plus `pinSource: "manual"` so the editor can
 * tell the two apart across reloads:
 * - auto success → "✓ Location detected"
 * - manual confirm → "✓ Location selected" (never "automatically detected")
 * - failed re-validation must never wipe a manual pin whose link is
 *   unchanged; changing the link clears everything.
 */

export type MapPoint = { latitude: number; longitude: number };

export type PinSource = "auto" | "manual";

/** Neutral picker start when nothing is saved (Casablanca area). */
export const DEFAULT_MAP_CENTER: MapPoint & { zoom: number } = {
  latitude: 31.63,
  longitude: -7.99,
  zoom: 6,
};

function inRange(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Loose validity check for unknown settings values. */
export function isValidPoint(value: unknown): value is MapPoint {
  if (typeof value !== "object" || value === null) return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return (
    typeof latitude === "number" && typeof longitude === "number" && inRange(latitude, longitude)
  );
}

/** Read saved coordinates out of location settings (any provenance). */
export function readSavedPoint(settings: Record<string, unknown>): MapPoint | null {
  const { latitude, longitude } = settings;
  return typeof latitude === "number" &&
    typeof longitude === "number" &&
    inRange(latitude, longitude)
    ? { latitude, longitude }
    : null;
}

/** Read the persisted pin provenance (`"auto" | "manual"`, else null). */
export function readPinSource(settings: Record<string, unknown>): PinSource | null {
  return settings.pinSource === "auto" || settings.pinSource === "manual"
    ? settings.pinSource
    : null;
}

/** Where the picker should center: saved point when valid, else the default. */
export function pickerInitialCenter(
  settings: Record<string, unknown>,
): MapPoint & { zoom: number } {
  const saved = readSavedPoint(settings);
  return saved ? { ...saved, zoom: 15 } : DEFAULT_MAP_CENTER;
}

/**
 * Normalize a tapped/dragged map point. Leaflet longitudes can wander
 * past ±180 when panning — wrap them. Anything outside latitude bounds
 * (or non-finite) is rejected so invalid coordinates are never saved.
 */
export function normalizePickedPoint(latitude: number, longitude: number): MapPoint | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  // In-range values pass through byte-identical; only runaway longitudes
  // (Leaflet panning past ±180) are wrapped, rounded to 5 decimals (~1 m,
  // the same precision the OSM embed and picker display use).
  if (longitude >= -180 && longitude <= 180) return { latitude, longitude };
  const wrapped = (((longitude + 180) % 360) + 360) % 360;
  const wrappedLng = Math.round((wrapped - 180) * 100_000) / 100_000;
  return { latitude, longitude: wrappedLng === 180 ? -180 : wrappedLng };
}

/**
 * Commit payload for a confirmed manual pick. Returns null when the
 * point is invalid — the caller must not persist anything then.
 */
export function manualPinCommit(
  latitude: number,
  longitude: number,
): (MapPoint & { pinSource: PinSource }) | null {
  const point = normalizePickedPoint(latitude, longitude);
  return point ? { ...point, pinSource: "manual" as const } : null;
}

/**
 * Should a failed automatic resolution clear the saved coordinates?
 * Only when they cannot belong to the current link: the link changed
 * this session, or the saved pin is not a manual one. A manual pin
 * whose link is unchanged survives re-validation failures (it was
 * chosen by the operator, not by the resolver).
 */
export function shouldClearOnResolveFailure(args: {
  linkChangedThisSession: boolean;
  pinSource: PinSource | null;
}): boolean {
  if (args.linkChangedThisSession) return true;
  return args.pinSource !== "manual";
}
