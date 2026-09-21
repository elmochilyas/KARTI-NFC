import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  ANDROID_MANUAL_HINT,
  DESKTOP_KEEP_MESSAGE,
  KeepProfileButton,
  detectInstallPlatform,
  isRunningStandalone,
} from "./KeepProfileButton";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const SAMSUNG_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("detectInstallPlatform", () => {
  it("routes iPhones and iPads to the guided iOS flow", () => {
    expect(detectInstallPlatform(IPHONE_UA)).toBe("ios");
    expect(detectInstallPlatform(IPAD_UA)).toBe("ios");
  });

  it("routes Android browsers to the native-prompt flow", () => {
    expect(detectInstallPlatform(ANDROID_CHROME_UA)).toBe("android");
    expect(detectInstallPlatform(SAMSUNG_UA)).toBe("android");
  });

  it("routes everything else to the desktop note", () => {
    expect(detectInstallPlatform(DESKTOP_UA)).toBe("desktop");
    expect(detectInstallPlatform("")).toBe("desktop");
  });
});

describe("isRunningStandalone", () => {
  it("detects the installed app via display-mode or the iOS flag", () => {
    expect(isRunningStandalone({ matches: true }, undefined)).toBe(true);
    expect(isRunningStandalone({ matches: false }, true)).toBe(true);
    expect(isRunningStandalone({ matches: false }, false)).toBe(false);
    // Node (no window): never standalone, never throws.
    expect(isRunningStandalone()).toBe(false);
  });
});

describe("KeepProfileButton markup", () => {
  function render(dark = false): string {
    return renderToStaticMarkup(createElement(KeepProfileButton, { dark }));
  }

  it("renders the Keep CTA with its caption before hydration", () => {
    const html = render();
    expect(html).toContain("Keep Profile");
    expect(html).toContain("Keep this digital card on your phone");
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Keep Profile');
  });

  it("shows no install modal, no manual hint, and no wallet wording initially", () => {
    const html = render();
    expect(html).not.toContain("Add to Home Screen");
    expect(html).not.toContain(ANDROID_MANUAL_HINT);
    expect(html.toLowerCase()).not.toContain("wallet");
  });

  it("keeps the CTA usable in dark mode with accessible targets", () => {
    const html = render(true);
    expect(html).toContain("Keep Profile");
    expect(html).toContain("min-h-[68px]");
  });

  it("exports the exact desktop guidance copy", () => {
    expect(DESKTOP_KEEP_MESSAGE).toBe("Open this profile on your phone to keep it.");
  });
});
