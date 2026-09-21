import { describe, expect, it } from "vitest";
import {
  PROFILE_ICON_SIZES,
  iconBackground,
  iconFallbackSvg,
  iconInitials,
} from "./icons";

describe("PROFILE_ICON_SIZES", () => {
  it("serves square install icons plus the iOS touch icon", () => {
    expect(PROFILE_ICON_SIZES).toEqual({
      "icon-192.png": 192,
      "icon-512.png": 512,
      "apple-touch-icon.png": 180,
    });
  });
});

describe("iconInitials", () => {
  it("derives two-letter initials from the display name", () => {
    expect(iconInitials("Ilyas El Moch")).toBe("IM");
    expect(iconInitials("  María  José  ")).toBe("MJ");
    expect(iconInitials("Atlas")).toBe("AT");
    expect(iconInitials("A")).toBe("A");
    expect(iconInitials("أحمد بن علي")).toBe("أع");
    expect(iconInitials("   ")).toBe("K");
    expect(iconInitials("")).toBe("K");
  });
});

describe("iconBackground", () => {
  it("passes valid hex through and rejects hostile values", () => {
    expect(iconBackground("#123456")).toBe("#123456");
    expect(iconBackground(null)).toBe("#0e7c5b");
    expect(iconBackground("red")).toBe("#0e7c5b");
    expect(iconBackground('" onload="alert(1)')).toBe("#0e7c5b");
  });
});

describe("iconFallbackSvg", () => {
  it("renders a square tile with escaped initials", () => {
    const svg = iconFallbackSvg("IE", "#123456", 512);
    expect(svg).toContain('width="512"');
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain(">IE<");
    const hostile = iconFallbackSvg('<script>&"', "#123456", 192);
    expect(hostile).not.toContain("<script>");
    expect(hostile).toContain("&lt;script&gt;&amp;&quot;");
  });
});
