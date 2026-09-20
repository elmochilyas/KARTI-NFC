import { permanentCardUrl } from "./service";

/**
 * QR payload helpers (ADR: Phase 9 uses the `qrcode` package for rendering;
 * the payload itself is defined here, once).
 *
 * The QR encodes EXACTLY the permanent card URL — the same string NFC
 * writes. Never a profile slug, never a destination URL. Destination
 * switches therefore never invalidate printed QR codes.
 */

export const QR_DISPLAY_SIZE = 240;
export const QR_EXPORT_SIZE = 1024;
export const QR_MARGIN_MODULES = 2;
export const QR_EXPORT_MARGIN_MODULES = 4;

/** Canonical QR payload for a card. Only the short code feeds it. */
export function qrPayloadForCard(shortCode: string): string {
  return permanentCardUrl(shortCode.trim().toUpperCase());
}

/** Safe download filename from URL-safe identifiers only (never client names). */
export function qrDownloadFilename(cardNumber: string, shortCode: string): string {
  const safe = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
  return `karti-${safe(cardNumber)}-${safe(shortCode)}-qr.png`;
}

/** Read PNG dimensions from the IHDR chunk (for export verification). */
export function pngDimensions(png: Buffer): { width: number; height: number } | null {
  if (png.length < 33) return null;
  if (
    png[0] !== 0x89 ||
    png[1] !== 0x50 ||
    png[2] !== 0x4e ||
    png[3] !== 0x47 ||
    png[4] !== 0x0d ||
    png[5] !== 0x0a ||
    png[6] !== 0x1a ||
    png[7] !== 0x0a
  ) {
    return null;
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
