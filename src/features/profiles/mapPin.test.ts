import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_CENTER,
  isValidPoint,
  manualPinCommit,
  normalizePickedPoint,
  pickerInitialCenter,
  readPinSource,
  readSavedPoint,
  shouldClearOnResolveFailure,
} from "./mapPin";

describe("mapPin helpers", () => {
  it("reads saved points and provenance", () => {
    expect(readSavedPoint({ latitude: 31.6, longitude: -7.9 })).toEqual({
      latitude: 31.6,
      longitude: -7.9,
    });
    expect(readSavedPoint({ latitude: 91, longitude: 0 })).toBeNull();
    expect(readSavedPoint({ latitude: "31.6", longitude: -7.9 })).toBeNull();
    expect(readSavedPoint({})).toBeNull();
    expect(readPinSource({ pinSource: "manual" })).toBe("manual");
    expect(readPinSource({ pinSource: "auto" })).toBe("auto");
    expect(readPinSource({})).toBeNull();
    expect(readPinSource({ pinSource: "resolve" })).toBeNull();
    expect(isValidPoint({ latitude: 0, longitude: 0 })).toBe(true);
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint(null)).toBe(false);
  });

  it("centers the picker on saved coordinates, else the Morocco default", () => {
    expect(pickerInitialCenter({ latitude: 30.42, longitude: -9.6 })).toEqual({
      latitude: 30.42,
      longitude: -9.6,
      zoom: 15,
    });
    expect(pickerInitialCenter({})).toEqual(DEFAULT_MAP_CENTER);
    expect(pickerInitialCenter({ latitude: 91, longitude: 0 })).toEqual(DEFAULT_MAP_CENTER);
  });

  it("normalizes taps: wraps runaway longitudes, rejects bad latitudes", () => {
    expect(normalizePickedPoint(31.6, -7.9)).toEqual({ latitude: 31.6, longitude: -7.9 });
    expect(normalizePickedPoint(31.6, 352.1)).toEqual({ latitude: 31.6, longitude: -7.9 });
    expect(normalizePickedPoint(91, 0)).toBeNull();
    expect(normalizePickedPoint(-91, 0)).toBeNull();
    expect(normalizePickedPoint(Number.NaN, 0)).toBeNull();
    expect(normalizePickedPoint(0, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("manual confirm commits coordinates tagged manual; invalid commits nothing", () => {
    expect(manualPinCommit(31.6, -7.9)).toEqual({
      latitude: 31.6,
      longitude: -7.9,
      pinSource: "manual",
    });
    expect(manualPinCommit(91, 0)).toBeNull();
    expect(manualPinCommit(Number.NaN, 0)).toBeNull();
  });

  it("failed resolution clears stale pins but never an unchanged manual pin", () => {
    // Link changed → always clear (auto and manual alike).
    expect(shouldClearOnResolveFailure({ linkChangedThisSession: true, pinSource: "auto" })).toBe(
      true,
    );
    expect(shouldClearOnResolveFailure({ linkChangedThisSession: true, pinSource: "manual" })).toBe(
      true,
    );
    expect(shouldClearOnResolveFailure({ linkChangedThisSession: true, pinSource: null })).toBe(
      true,
    );
    // Same link → auto/legacy pins may clear, manual pins survive.
    expect(shouldClearOnResolveFailure({ linkChangedThisSession: false, pinSource: "auto" })).toBe(
      true,
    );
    expect(shouldClearOnResolveFailure({ linkChangedThisSession: false, pinSource: null })).toBe(
      true,
    );
    expect(
      shouldClearOnResolveFailure({ linkChangedThisSession: false, pinSource: "manual" }),
    ).toBe(false);
  });
});
