import { describe, expect, it, vi } from "vitest";
import { createNfcWriter, type NdefReaderLike } from "./writer";
import { permanentCardUrl } from "@/features/cards/service";
import { qrPayloadForCard } from "@/features/cards/qr";

function domError(name: string): DOMException {
  // DOMException constructor is available in Node 24 for test doubles.
  return new DOMException("mocked", name);
}

describe("capability detection", () => {
  it("reports unsupported with no browser globals", () => {
    expect(createNfcWriter().isSupported()).toBe(false);
  });

  it("reports supported when a factory is injected", () => {
    const writer = createNfcWriter(() => ({ write: async () => {} }));
    expect(writer.isSupported()).toBe(true);
  });
});

describe("writeUrl payload", () => {
  it("writes exactly the permanent card URL as an NDEF URL record", async () => {
    const written: { records: { recordType: string; data: string }[] }[] = [];
    const reader: NdefReaderLike = {
      write: async (message) => {
        written.push(message);
      },
    };
    const url = permanentCardUrl("K7DX29P4");
    const result = await createNfcWriter(() => reader).writeUrl(url);
    expect(result).toEqual({ ok: true });
    expect(written).toHaveLength(1);
    expect(written[0]).toEqual({ records: [{ recordType: "url", data: url }] });
    expect(written[0]?.records[0]?.data).toContain("/t/K7DX29P4");
  });

  it("writes the identical payload QR encodes (parity by architecture)", async () => {
    const seen: string[] = [];
    const reader: NdefReaderLike = {
      write: async (message) => {
        seen.push(message.records.map((r) => r.data).join(" "));
      },
    };
    const shortCode = "K7DX29P4";
    await createNfcWriter(() => reader).writeUrl(permanentCardUrl(shortCode));
    expect(seen).toEqual([qrPayloadForCard(shortCode)]);
  });

  it("never writes profile, destination, or secret payloads", async () => {
    const seen: string[] = [];
    const reader: NdefReaderLike = {
      write: async (message) => {
        seen.push(message.records.map((r) => r.data).join(" "));
      },
    };
    const writer = createNfcWriter(() => reader);
    await writer.writeUrl(permanentCardUrl("K7DX29P4"));
    const payload = seen.join(" ");
    for (const forbidden of ["instagram.com", "/ahmed-benali", "service_role", "sbp_", "token"]) {
      expect(payload).not.toContain(forbidden);
    }
  });

  it("rejects empty payloads without touching the tag", async () => {
    const write = vi.fn(async () => {});
    const result = await createNfcWriter(() => ({ write })).writeUrl("   ");
    expect(result).toEqual({ ok: false, reason: "WRITE_FAILED" });
    expect(write).not.toHaveBeenCalled();
  });
});

describe("write result mapping", () => {
  it("maps success", async () => {
    const result = await createNfcWriter(() => ({ write: async () => {} })).writeUrl(
      "https://karti.app/t/X",
    );
    expect(result).toEqual({ ok: true });
  });

  it("maps permission denial", async () => {
    const reader: NdefReaderLike = {
      write: async () => {
        throw domError("NotAllowedError");
      },
    };
    expect(await createNfcWriter(() => reader).writeUrl("https://karti.app/t/X")).toEqual({
      ok: false,
      reason: "PERMISSION_DENIED",
    });
  });

  it("maps cancellation", async () => {
    const reader: NdefReaderLike = {
      write: async () => {
        throw domError("AbortError");
      },
    };
    expect(await createNfcWriter(() => reader).writeUrl("https://karti.app/t/X")).toEqual({
      ok: false,
      reason: "CANCELLED",
    });
  });

  it("maps generic failures without leaking native messages", async () => {
    const reader: NdefReaderLike = {
      write: async () => {
        throw new Error("Tag was lost, tag was removed. super secret token=abc");
      },
    };
    const result = await createNfcWriter(() => reader).writeUrl("https://karti.app/t/X");
    expect(result).toEqual({ ok: false, reason: "WRITE_FAILED" });
  });

  it("treats factory construction failure as unsupported", async () => {
    const result = await createNfcWriter(() => {
      throw new Error("nope");
    }).writeUrl("https://karti.app/t/X");
    expect(result).toEqual({ ok: false, reason: "UNSUPPORTED" });
  });

  it("reports unsupported with no factory and no browser API", async () => {
    expect(await createNfcWriter().writeUrl("https://karti.app/t/X")).toEqual({
      ok: false,
      reason: "UNSUPPORTED",
    });
  });
});
