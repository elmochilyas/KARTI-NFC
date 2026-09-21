import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jose from "jose";

vi.mock("server-only", () => ({}));

import { createGoogleWalletSaveLink, isGoogleWalletConfigured } from "./service";
import { GOOGLE_SAVE_BASE } from "./generateLink";
import type { PublicWalletData } from "../types";

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

const GOOGLE_KEYS = [
  "GOOGLE_WALLET_ISSUER_ID",
  "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_WALLET_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of GOOGLE_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of GOOGLE_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

async function configureGoogle(withKeyId: boolean): Promise<void> {
  const { privateKey } = await jose.generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  const pem = await jose.exportPKCS8(privateKey);
  process.env.GOOGLE_WALLET_ISSUER_ID = "1234567890";
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = "svc@example.iam.gserviceaccount.com";
  // Store with \n escapes, as operators do in .env files.
  process.env.GOOGLE_WALLET_PRIVATE_KEY = pem.replace(/\n/g, "\\n");
  if (withKeyId) process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID = "key-1";
  process.env.NEXT_PUBLIC_APP_URL = "https://karti.app";
}

describe("createGoogleWalletSaveLink", () => {
  it("mints a signed save link with the identity payload", async () => {
    await configureGoogle(true);
    expect(isGoogleWalletConfigured()).toBe(true);
    const result = await createGoogleWalletSaveLink(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.startsWith(GOOGLE_SAVE_BASE)).toBe(true);
    const jwt = result.data.slice(GOOGLE_SAVE_BASE.length);
    const payload = jose.decodeJwt(jwt) as Record<string, unknown>;
    expect(payload.iss).toBe("svc@example.iam.gserviceaccount.com");
    expect(payload.aud).toBe("google");
    expect(payload.typ).toBe("savetowallet");
    expect(payload.origins).toEqual(["https://karti.app"]);
    const objects = (
      payload.payload as { genericObjects: { id: string; barcode: { value: string } }[] }
    ).genericObjects;
    expect(objects[0].id).toBe("1234567890.ABCD234567");
    expect(objects[0].barcode.value).toBe("https://karti.app/u/ABCD234567");
    expect(jose.decodeProtectedHeader(jwt).kid).toBe("key-1");
  });

  it("works without a key id and never leaks the private key", async () => {
    await configureGoogle(false);
    const result = await createGoogleWalletSaveLink(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      jose.decodeProtectedHeader(result.data.slice(GOOGLE_SAVE_BASE.length)).kid,
    ).toBeUndefined();
    expect(result.data).not.toContain("PRIVATE KEY");
  });

  it("fails closed without credentials", async () => {
    expect(isGoogleWalletConfigured()).toBe(false);
    const result = await createGoogleWalletSaveLink(BASE);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "WALLET_NOT_CONFIGURED",
        message: "Unable to create wallet card. Please try again.",
      },
    });
  });

  it("rejects non-key material at the gate", async () => {
    process.env.GOOGLE_WALLET_ISSUER_ID = "123";
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = "svc@example.iam.gserviceaccount.com";
    process.env.GOOGLE_WALLET_PRIVATE_KEY = "not-a-key";
    expect(isGoogleWalletConfigured()).toBe(false);
    const result = await createGoogleWalletSaveLink(BASE);
    expect(result.ok).toBe(false);
  });
});
