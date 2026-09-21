import { describe, expect, it } from "vitest";
import {
  generatePublicCode,
  identityUrlForPublicCode,
  isValidPublicCodeFormat,
  normalizePublicCode,
  PUBLIC_CODE_LENGTH,
} from "./publicCode";

describe("publicCode", () => {
  it("generates 10-char codes from the unambiguous alphabet", () => {
    expect(PUBLIC_CODE_LENGTH).toBe(10);
    const code = generatePublicCode();
    expect(code).toHaveLength(10);
    expect(isValidPublicCodeFormat(code)).toBe(true);
    expect(code).not.toMatch(/[01IL]/);
    expect(code).not.toMatch(/O/);
  });

  it("maps injected bytes deterministically", () => {
    const a = generatePublicCode(new Uint8Array(10).fill(7));
    const b = generatePublicCode(new Uint8Array(10).fill(7));
    expect(a).toBe(b);
    expect(a).toHaveLength(10);
  });

  it("normalizes case and trims", () => {
    expect(normalizePublicCode("  abcd234567 ")).toBe("ABCD234567");
  });

  it("rejects card short codes, slugs, and hostile input", () => {
    for (const bad of ["", "ABCDEFGH", "KARTI-000123", "ahmed-benali", "!!!", "ABCD23456\nX"]) {
      expect(isValidPublicCodeFormat(bad)).toBe(false);
    }
  });

  it("builds the canonical /u/ identity URL, never /t/", () => {
    expect(identityUrlForPublicCode("https://karti.app/", "abcd234567")).toBe(
      "https://karti.app/u/ABCD234567",
    );
    expect(identityUrlForPublicCode("https://karti.app", "ABCD234567")).not.toContain("/t/");
  });
});
