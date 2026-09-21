import { describe, expect, it } from "vitest";
import { detectPlatform } from "./detectPlatform";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const SAMSUNG_INTERNET =
  "Mozilla/5.0 (Linux; Android 14; S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DESKTOP_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";

describe("detectPlatform", () => {
  it("detects iOS phones and tablets", () => {
    expect(detectPlatform(IPHONE_SAFARI)).toBe("ios");
    expect(detectPlatform(IPAD_SAFARI)).toBe("ios");
  });

  it("detects iPadOS desktop mode via the mobile hint, not plain macOS", () => {
    expect(detectPlatform(IPAD_DESKTOP_MODE, { mobile: true })).toBe("ios");
    expect(detectPlatform(IPAD_DESKTOP_MODE, { platform: "iOS" })).toBe("ios");
    expect(detectPlatform(DESKTOP_SAFARI)).toBe("desktop");
  });

  it("detects Android across browsers (same save link for all)", () => {
    expect(detectPlatform(ANDROID_CHROME)).toBe("android");
    expect(detectPlatform(SAMSUNG_INTERNET)).toBe("android");
    expect(detectPlatform(DESKTOP_CHROME, { platform: "Android" })).toBe("android");
  });

  it("falls back to desktop for desktops, bots, and garbage", () => {
    expect(detectPlatform(DESKTOP_CHROME)).toBe("desktop");
    expect(detectPlatform("Googlebot/2.1")).toBe("desktop");
    for (const bad of ["", null, undefined, 42, "!!!"]) {
      expect(detectPlatform(bad)).toBe("desktop");
    }
  });

  it("prefers iOS over Android when both tokens appear", () => {
    expect(detectPlatform(`${IPHONE_SAFARI} Android`)).toBe("ios");
  });
});
