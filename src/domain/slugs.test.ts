import { describe, expect, it } from "vitest";
import { isReservedSlug, normalizeSlug } from "./slugs";

describe("normalizeSlug", () => {
  it("lowercases and trims", () => {
    expect(normalizeSlug("  Younes-Barrag ")).toBe("younes-barrag");
  });

  it("converts spaces and underscores to single hyphens", () => {
    expect(normalizeSlug("cafe  atlas__marrakech")).toBe("cafe-atlas-marrakech");
  });

  it("removes unsupported characters", () => {
    expect(normalizeSlug("Younes! @Barrag#")).toBe("younes-barrag");
  });

  it("collapses repeated hyphens and strips edge hyphens", () => {
    expect(normalizeSlug("--hello---world--")).toBe("hello-world");
  });

  it("transliterates diacritics instead of dropping characters", () => {
    expect(normalizeSlug("Café Atlas")).toBe("cafe-atlas");
  });

  it("returns empty string when nothing usable remains", () => {
    expect(normalizeSlug("!!!")).toBe("");
    expect(normalizeSlug("   ")).toBe("");
  });
});

describe("isReservedSlug", () => {
  it.each(["admin", "dashboard", "login", "logout", "api", "auth", "t", "new"])(
    "reserves application route %s",
    (slug) => {
      expect(isReservedSlug(slug)).toBe(true);
    },
  );

  it("is case-insensitive", () => {
    expect(isReservedSlug("Login")).toBe(true);
    expect(isReservedSlug("DASHBOARD")).toBe(true);
  });

  it("treats empty slugs as reserved", () => {
    expect(isReservedSlug("")).toBe(true);
    expect(isReservedSlug("!!!")).toBe(true);
  });

  it("allows ordinary slugs", () => {
    expect(isReservedSlug("younes-barrag")).toBe(false);
    expect(isReservedSlug("cafe-atlas")).toBe(false);
  });

  it("cannot be turned into path traversal or route hijack", () => {
    // Dots and slashes never survive normalization; traversal collapses
    // onto reserved names, which are rejected.
    expect(normalizeSlug("../admin")).toBe("admin");
    expect(isReservedSlug(normalizeSlug("../admin"))).toBe(true);
    expect(normalizeSlug("..\\dashboard")).toBe("dashboard");
    expect(normalizeSlug("t")).toBe("t");
    expect(isReservedSlug("t")).toBe(true);
    expect(normalizeSlug("API/v1")).toBe("apiv1");
  });
});
