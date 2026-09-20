import { describe, expect, it } from "vitest";
import { validateSafeExternalUrl } from "./urls";

describe("validateSafeExternalUrl", () => {
  it("accepts valid https URLs and normalizes them", () => {
    expect(validateSafeExternalUrl("https://instagram.com/example")).toBe(
      "https://instagram.com/example",
    );
  });

  it("accepts valid http URLs", () => {
    expect(validateSafeExternalUrl("http://example.com/menu")).toBe("http://example.com/menu");
  });

  it("trims surrounding whitespace", () => {
    expect(validateSafeExternalUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<h1>hi</h1>",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
  ])("rejects unsafe scheme %s", (url) => {
    expect(validateSafeExternalUrl(url)).toBeNull();
  });

  it("rejects relative and malformed URLs", () => {
    expect(validateSafeExternalUrl("/just/a/path")).toBeNull();
    expect(validateSafeExternalUrl("not a url")).toBeNull();
    expect(validateSafeExternalUrl("https://")).toBeNull();
  });

  it("rejects control characters and header-injection shapes", () => {
    expect(validateSafeExternalUrl("https://example.com/a\r\nB: evil")).toBeNull();
    expect(validateSafeExternalUrl("https://example.com/\u0000")).toBeNull();
    expect(validateSafeExternalUrl("https://example.com/\u007f")).toBeNull();
  });

  it("rejects credentialed URLs and over-long values", () => {
    expect(validateSafeExternalUrl("https://user:pass@example.com/")).toBeNull();
    expect(validateSafeExternalUrl(`https://example.com/${"a".repeat(2048)}`)).toBeNull();
    expect(validateSafeExternalUrl(`https://example.com/${"a".repeat(2000)}`)).not.toBeNull();
  });

  it("rejects empty and non-string input", () => {
    expect(validateSafeExternalUrl("")).toBeNull();
    expect(validateSafeExternalUrl("   ")).toBeNull();
    expect(validateSafeExternalUrl(null)).toBeNull();
    expect(validateSafeExternalUrl(undefined)).toBeNull();
    expect(validateSafeExternalUrl(42)).toBeNull();
  });
});
