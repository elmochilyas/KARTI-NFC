import { describe, expect, it } from "vitest";
import { railEdgeState, railScrollDelta, railStepFromWidths } from "./railNav";

describe("railStepFromWidths", () => {
  it("measures one card plus the flex gap", () => {
    expect(railStepFromWidths(300, 24, 1200)).toBe(324);
  });

  it("falls back to 80% of the viewport before layout", () => {
    expect(railStepFromWidths(0, 0, 1000)).toBe(800);
  });

  it("never returns zero", () => {
    expect(railStepFromWidths(0, 0, 0)).toBe(1);
  });
});

describe("railScrollDelta", () => {
  it("moves forward in LTR", () => {
    expect(railScrollDelta(1, 324, false)).toBe(324);
    expect(railScrollDelta(-1, 324, false)).toBe(-324);
  });

  it("flips the sign in RTL so next still advances", () => {
    expect(railScrollDelta(1, 324, true)).toBe(-324);
    expect(railScrollDelta(-1, 324, true)).toBe(324);
  });

  it("always moves at least one pixel", () => {
    expect(railScrollDelta(1, 0, false)).toBe(1);
  });
});

describe("railEdgeState", () => {
  it("reports start at scroll origin", () => {
    const state = railEdgeState(0, 2000, 1000);
    expect(state.atStart).toBe(true);
    expect(state.atEnd).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.visible).toBe(0.5);
  });

  it("reports end at max scroll", () => {
    const state = railEdgeState(1000, 2000, 1000);
    expect(state.atStart).toBe(false);
    expect(state.atEnd).toBe(true);
    expect(state.progress).toBe(1);
  });

  it("treats negative RTL offsets like LTR via abs", () => {
    const ltr = railEdgeState(1000, 2000, 1000);
    const rtl = railEdgeState(-1000, 2000, 1000);
    expect(rtl.atEnd).toBe(ltr.atEnd);
    expect(rtl.progress).toBe(ltr.progress);
  });

  it("treats non-overflowing rails as both edges", () => {
    const state = railEdgeState(0, 800, 1000);
    expect(state.atStart).toBe(true);
    expect(state.atEnd).toBe(true);
    expect(state.progress).toBe(1);
    expect(state.visible).toBe(1);
  });
});
