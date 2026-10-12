import { describe, expect, it } from "vitest";
import {
  computeOrderTotal,
  formatMinorDecimal,
  formatMinorToMad,
  isNonNegativeMinor,
  parseMadDecimalToMinor,
} from "./money";

describe("order money", () => {
  it("parses whole and decimal MAD strings into minor units", () => {
    expect(parseMadDecimalToMinor("1250")).toBe(125000);
    expect(parseMadDecimalToMinor("1250.5")).toBe(125050);
    expect(parseMadDecimalToMinor("1250.50")).toBe(125050);
    expect(parseMadDecimalToMinor("0")).toBe(0);
    expect(parseMadDecimalToMinor("0.99")).toBe(99);
    expect(parseMadDecimalToMinor("1 250,50")).toBe(125050);
    expect(parseMadDecimalToMinor("  99.9  ")).toBe(9990);
  });

  it("rejects negatives, excess decimals, and garbage", () => {
    expect(parseMadDecimalToMinor("-5")).toBeNull();
    expect(parseMadDecimalToMinor("12.345")).toBeNull();
    expect(parseMadDecimalToMinor("12.3.4")).toBeNull();
    expect(parseMadDecimalToMinor("abc")).toBeNull();
    expect(parseMadDecimalToMinor("12a")).toBeNull();
    expect(parseMadDecimalToMinor("")).toBeNull();
    expect(parseMadDecimalToMinor(".5")).toBeNull();
    expect(parseMadDecimalToMinor(null)).toBeNull();
    expect(parseMadDecimalToMinor(1250)).toBeNull();
  });

  it("computes total = subtotal + delivery − discount", () => {
    expect(
      computeOrderTotal({ subtotalMinor: 10000, deliveryFeeMinor: 2000, discountMinor: 500 }),
    ).toBe(11500);
    expect(computeOrderTotal({ subtotalMinor: 0, deliveryFeeMinor: 0, discountMinor: 0 })).toBe(0);
  });

  it("rejects discounts that would make the total negative", () => {
    expect(
      computeOrderTotal({ subtotalMinor: 1000, deliveryFeeMinor: 0, discountMinor: 1001 }),
    ).toBeNull();
    expect(
      computeOrderTotal({ subtotalMinor: -1, deliveryFeeMinor: 0, discountMinor: 0 }),
    ).toBeNull();
  });

  it("validates minor-unit integers", () => {
    expect(isNonNegativeMinor(0)).toBe(true);
    expect(isNonNegativeMinor(19900)).toBe(true);
    expect(isNonNegativeMinor(-1)).toBe(false);
    expect(isNonNegativeMinor(19.9)).toBe(false);
    expect(isNonNegativeMinor("100")).toBe(false);
  });

  it("formats minor units for display", () => {
    expect(formatMinorToMad(125050)).toBe("1250.50 MAD");
    expect(formatMinorToMad(null)).toBe("—");
  });

  it("formats the decimal with integer-only math (no floating point drift)", () => {
    expect(formatMinorDecimal(19900)).toBe("199.00");
    expect(formatMinorDecimal(24950)).toBe("249.50");
    expect(formatMinorDecimal(5)).toBe("0.05");
    expect(formatMinorDecimal(0)).toBe("0.00");
    // `(minor / 100).toFixed(2)` drifts here; integer math must not.
    expect(formatMinorDecimal(9000000000000015)).toBe("90000000000000.15");
    expect(formatMinorDecimal(9000000000000004)).toBe("90000000000000.04");
  });
});
