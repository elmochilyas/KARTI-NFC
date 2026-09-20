import { describe, expect, it } from "vitest";
import {
  CARD_SHORT_CODE_ALPHABET,
  CARD_SHORT_CODE_LENGTH,
  generateCardShortCode,
  isValidShortCodeFormat,
  normalizeShortCode,
} from "./cards";

describe("generateCardShortCode", () => {
  it("produces the configured length from the allowed alphabet", () => {
    for (let i = 0; i < 25; i += 1) {
      const code = generateCardShortCode();
      expect(code).toHaveLength(CARD_SHORT_CODE_LENGTH);
      expect(isValidShortCodeFormat(code)).toBe(true);
    }
  });

  it("maps injected bytes deterministically", () => {
    const bytes = new Uint8Array(CARD_SHORT_CODE_LENGTH).fill(0);
    const expected = CARD_SHORT_CODE_ALPHABET[0]!.repeat(CARD_SHORT_CODE_LENGTH);
    expect(generateCardShortCode(bytes)).toBe(expected);
  });

  it("generates non-sequential codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCardShortCode()));
    expect(codes.size).toBeGreaterThan(40);
  });

  it("uses only URL-safe characters without ambiguous glyphs", () => {
    expect(CARD_SHORT_CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    expect(generateCardShortCode()).toMatch(/^[A-Z2-9]+$/);
  });
});

describe("normalizeShortCode / isValidShortCodeFormat", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeShortCode("  k7dx29p4 ")).toBe("K7DX29P4");
  });

  it("rejects wrong lengths and predictable codes", () => {
    expect(isValidShortCodeFormat("K7DX29")).toBe(false);
    expect(isValidShortCodeFormat("card-12")).toBe(false);
    expect(isValidShortCodeFormat("")).toBe(false);
  });
});
