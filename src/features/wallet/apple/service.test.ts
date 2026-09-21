import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import forge from "node-forge";

vi.mock("server-only", () => ({}));

import {
  APPLE_PKPASS_MIME,
  buildPassArtwork,
  createAppleWalletPass,
  isAppleWalletConfigured,
  splitP12,
} from "./service";
import type { PublicWalletData } from "../types";

const PASSPHRASE = "test-passphrase-123";

const BASE: PublicWalletData = {
  publicCode: "ABCD234567",
  slug: "ahmed-benali",
  displayName: "Ahmed Benali",
  jobTitle: "Developer",
  companyName: "Atlas Studio",
  phone: "+212600000000",
  email: "ahmed@example.com",
  website: "https://atlas.ma",
  avatarPath: null,
  accentColor: "#0e7c5b",
};

/** Mint a throwaway self-signed P12 (no real secrets anywhere in tests). */
function mintP12(passphrase: string): { p12Base64: string; certPem: string } {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  cert.setSubject([{ name: "commonName", value: "Karti Test" }]);
  cert.setIssuer([{ name: "commonName", value: "Karti Test" }]);
  cert.sign(keys.privateKey);
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], passphrase);
  const p12Base64 = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary").toString("base64");
  return { p12Base64, certPem: forge.pki.certificateToPem(cert) };
}

const APPLE_KEYS = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_PASS_CERT_P12_BASE64",
  "APPLE_PASS_CERT_PASSPHRASE",
  "APPLE_WWDR_CERT_PEM",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of APPLE_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of APPLE_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function configureApple(): void {
  const { p12Base64, certPem } = mintP12(PASSPHRASE);
  process.env.APPLE_PASS_TYPE_ID = "pass.app.karti.test";
  process.env.APPLE_TEAM_ID = "TEAMTEST";
  process.env.APPLE_PASS_CERT_P12_BASE64 = p12Base64;
  process.env.APPLE_PASS_CERT_PASSPHRASE = PASSPHRASE;
  process.env.APPLE_WWDR_CERT_PEM = certPem;
}

describe("splitP12", () => {
  it("round-trips a P12 into PEM cert + key", () => {
    const { p12Base64 } = mintP12(PASSPHRASE);
    const { certPem, keyPem } = splitP12(Buffer.from(p12Base64, "base64"), PASSPHRASE);
    expect(certPem).toContain("BEGIN CERTIFICATE");
    expect(keyPem).toContain("BEGIN RSA PRIVATE KEY");
  });

  it("throws on garbage input and wrong passphrases", () => {
    expect(() => splitP12(Buffer.from("not-a-p12"), PASSPHRASE)).toThrow();
    const { p12Base64 } = mintP12(PASSPHRASE);
    expect(() => splitP12(Buffer.from(p12Base64, "base64"), "wrong")).toThrow();
  });
});

describe("buildPassArtwork", () => {
  it("builds a solid accent tile without a photo", async () => {
    const art = await buildPassArtwork(null, "#0e7c5b");
    for (const [name, bytes] of Object.entries(art)) {
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
      void name;
    }
    expect((await sharp(art["icon.png"]).metadata()).width).toBe(180);
    expect((await sharp(art["logo.png"]).metadata()).width).toBe(320);
  });

  it("resizes the avatar and falls back on corrupt bytes", async () => {
    const avatar = await sharp({
      create: { width: 400, height: 200, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const art = await buildPassArtwork(avatar, "#0e7c5b");
    const meta = await sharp(art["icon.png"]).metadata();
    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
    const corrupt = await buildPassArtwork(Buffer.from("not-an-image"), "#0e7c5b");
    expect(corrupt["icon.png"].subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});

describe("createAppleWalletPass", () => {
  it("returns a signed .pkpass buffer with identity content", async () => {
    configureApple();
    expect(isAppleWalletConfigured()).toBe(true);
    const result = await createAppleWalletPass(BASE, "https://karti.app/u/ABCD234567");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mimeType).toBe(APPLE_PKPASS_MIME);
    expect(result.data.filename).toBe("ahmed-benali.pkpass");
    // ZIP container (passkit signs then zips: manifest + signature + assets).
    expect(result.data.buffer.subarray(0, 2).toString("binary")).toBe("PK");
    expect(result.data.buffer.includes("pass.json")).toBe(true);
    expect(result.data.buffer.includes("ABCD234567")).toBe(true);
    // No secret material inside the artifact.
    expect(result.data.buffer.includes(Buffer.from(PASSPHRASE))).toBe(false);
    expect(result.data.buffer.includes("PRIVATE KEY")).toBe(false);
  });

  it("fails closed without credentials (credential-gated, never fake)", async () => {
    expect(isAppleWalletConfigured()).toBe(false);
    const result = await createAppleWalletPass(BASE, "https://karti.app/u/ABCD234567");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "WALLET_NOT_CONFIGURED",
        message: "Unable to create wallet card. Please try again.",
      },
    });
  });

  it("fails generically on corrupt credentials (no detail leaked)", async () => {
    process.env.APPLE_PASS_TYPE_ID = "pass.app.karti.test";
    process.env.APPLE_TEAM_ID = "TEAMTEST";
    process.env.APPLE_PASS_CERT_P12_BASE64 = Buffer.from("garbage").toString("base64");
    process.env.APPLE_PASS_CERT_PASSPHRASE = "x";
    process.env.APPLE_WWDR_CERT_PEM =
      "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----";
    const result = await createAppleWalletPass(BASE, "https://karti.app/u/ABCD234567");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("GENERATION_FAILED");
    expect(result.error.message).toBe("Unable to create wallet card. Please try again.");
    expect(result.error.message).not.toContain("TEAMTEST");
  });
});
