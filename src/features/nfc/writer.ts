/**
 * Web NFC writer adapter (specs/NFC_QR.md §4, ADR-025).
 *
 * All browser NFC access lives here. The rest of Karti talks only to the
 * `NfcWriter` interface — never to `NDEFReader` directly — so behavior is
 * unit-testable with injected fakes and no hardware is needed.
 *
 * MVP rules enforced by design:
 * - payload is ALWAYS the permanent card URL (callers pass it in);
 * - standard NDEF URL record, no tag locking, no UID/serial storage;
 * - capability-based messaging (no device-name assumptions).
 */

export type NfcWriteFailureReason =
  "UNSUPPORTED" | "PERMISSION_DENIED" | "CANCELLED" | "WRITE_FAILED";

export type NfcWriteResult = { ok: true } | { ok: false; reason: NfcWriteFailureReason };

export interface NfcWriter {
  isSupported(): boolean;
  writeUrl(url: string): Promise<NfcWriteResult>;
}

/** Minimal Web NFC surface (the TS DOM lib has no Web NFC types). */
export type NdefRecordInit = {
  recordType: "url";
  data: string;
};

export type NdefReaderLike = {
  write(message: { records: NdefRecordInit[] }): Promise<void>;
};

export type NdefReaderFactory = () => NdefReaderLike;

declare global {
  interface Window {
    NDEFReader?: new () => NdefReaderLike;
  }
}

function domErrorName(error: unknown): string {
  return error instanceof DOMException ? error.name : "";
}

function mapWriteError(error: unknown): NfcWriteResult {
  const name = domErrorName(error);
  if (name === "NotAllowedError") return { ok: false, reason: "PERMISSION_DENIED" };
  if (name === "AbortError") return { ok: false, reason: "CANCELLED" };
  if (name === "NotSupportedError") return { ok: false, reason: "UNSUPPORTED" };
  return { ok: false, reason: "WRITE_FAILED" };
}

function detectSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return "NDEFReader" in window && typeof window.NDEFReader === "function";
  } catch {
    return false;
  }
}

/**
 * Create the browser writer. Pass a factory in tests to avoid touching
 * globals; production code calls it with no arguments.
 */
export function createNfcWriter(factory?: NdefReaderFactory): NfcWriter {
  return {
    isSupported(): boolean {
      if (factory) return true;
      return detectSupport();
    },
    async writeUrl(url: string): Promise<NfcWriteResult> {
      const trimmed = url.trim();
      if (!trimmed) return { ok: false, reason: "WRITE_FAILED" };
      let reader: NdefReaderLike;
      try {
        if (factory) {
          reader = factory();
        } else if (detectSupport() && window.NDEFReader) {
          reader = new window.NDEFReader();
        } else {
          return { ok: false, reason: "UNSUPPORTED" };
        }
      } catch {
        return { ok: false, reason: "UNSUPPORTED" };
      }
      try {
        // Standard NDEF URL record. Never locked, never enriched.
        await reader.write({ records: [{ recordType: "url", data: trimmed }] });
        return { ok: true };
      } catch (error) {
        return mapWriteError(error);
      }
    },
  };
}
