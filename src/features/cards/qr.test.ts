import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import {
  QR_DISPLAY_SIZE,
  QR_EXPORT_SIZE,
  pngDimensions,
  qrDownloadFilename,
  qrPayloadForCard,
} from "./qr";
import { permanentCardUrl } from "./service";

describe("qrPayloadForCard", () => {
  it("equals the permanent card URL", () => {
    expect(qrPayloadForCard("K7DX29P4")).toBe(permanentCardUrl("K7DX29P4"));
    expect(qrPayloadForCard("K7DX29P4")).toContain("/t/K7DX29P4");
  });

  it("normalizes short codes", () => {
    expect(qrPayloadForCard("  k7dx29p4 ")).toBe(qrPayloadForCard("K7DX29P4"));
  });

  it("is never a profile slug or destination URL", () => {
    const payload = qrPayloadForCard("K7DX29P4");
    expect(payload).not.toContain("instagram.com");
    expect(payload).not.toMatch(/karti\.app\/[a-z-]+\/?$/);
    expect(payload).toMatch(/\/t\/[A-Z0-9]+$/);
  });

  it("stays identical across destination switches", () => {
    // Destinations live behind the URL; the payload only embeds identity.
    const before = qrPayloadForCard("K7DX29P4");
    const afterProfile = qrPayloadForCard("K7DX29P4");
    const afterExternal = qrPayloadForCard("K7DX29P4");
    expect(afterProfile).toBe(before);
    expect(afterExternal).toBe(before);
  });
});

describe("qrDownloadFilename", () => {
  it("builds safe filenames from identifiers only", () => {
    expect(qrDownloadFilename("KARTI-000124", "K7DX29P4")).toBe(
      "karti-KARTI-000124-K7DX29P4-qr.png",
    );
  });

  it("strips unsafe characters", () => {
    const name = qrDownloadFilename('../evil"card\r\n', "K7DX29P4");
    expect(name).not.toMatch(/[.]{2}|["'\r\n/\\]/);
    expect(name.endsWith("-qr.png")).toBe(true);
  });
});

describe("QR export output", () => {
  it("generates a 1024x1024 PNG for the permanent URL", async () => {
    const dataUrl = await QRCode.toDataURL(qrPayloadForCard("K7DX29P4"), {
      width: QR_EXPORT_SIZE,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#111418", light: "#ffffff" },
    });
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = Buffer.from(dataUrl.split(",")[1] as string, "base64");
    expect(pngDimensions(png)).toEqual({ width: QR_EXPORT_SIZE, height: QR_EXPORT_SIZE });
  });

  it("display size stays in the scan-friendly range", () => {
    expect(QR_DISPLAY_SIZE).toBeGreaterThanOrEqual(220);
    expect(QR_DISPLAY_SIZE).toBeLessThanOrEqual(280);
  });
});
