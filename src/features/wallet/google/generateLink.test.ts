import { describe, expect, it } from "vitest";
import * as jose from "jose";
import {
  buildGoogleWalletObject,
  googleClassId,
  googleObjectId,
  googleSaveLink,
  GOOGLE_SAVE_BASE,
  signGoogleSaveJwt,
} from "./generateLink";
import type { GoogleWalletConfig } from "@/lib/env-server";
import type { PublicWalletData } from "../types";

const BASE: PublicWalletData = {
  publicCode: "ABCD234567",
  slug: "ahmed-benali",
  displayName: "Ahmed Benali",
  jobTitle: "Developer",
  companyName: "Atlas Studio",
  phone: "+212 600-000000",
  email: "ahmed@example.com",
  website: "https://atlas.ma",
  avatarPath: "profiles/x/avatar/y.webp",
  accentColor: "#0e7c5b",
};

const IDENTITY = "https://karti.app/u/ABCD234567";

describe("google object ids", () => {
  it("derives stable object/class ids from the issuer", () => {
    expect(googleObjectId("123456", "ABCD234567")).toBe("123456.ABCD234567");
    expect(googleClassId("123456")).toBe("123456.karti_profile_v1");
  });
});

describe("buildGoogleWalletObject", () => {
  it("builds an ACTIVE generic object with identity barcode", () => {
    const object = buildGoogleWalletObject(
      BASE,
      IDENTITY,
      "https://cdn.example/avatar.webp",
      "123",
    );
    expect(object.id).toBe("123.ABCD234567");
    expect(object.classId).toBe("123.karti_profile_v1");
    expect(object.state).toBe("ACTIVE");
    expect((object.cardTitle as { value: string }).value).toBe("Ahmed Benali");
    expect((object.barcode as { type: string; value: string }).type).toBe("QR_CODE");
    expect((object.barcode as { value: string }).value).toBe(IDENTITY);
    expect((object.barcode as { value: string }).value).not.toContain("/t/");
    const uris = (object.linksModuleData as { uris: { uri: string }[] }).uris.map((u) => u.uri);
    // validateSafeExternalUrl normalizes the bare host with a trailing slash.
    expect(uris).toContain("https://atlas.ma/");
    expect(uris).toContain(IDENTITY);
    expect(uris).toContain("tel:+212600000000");
    expect((object.logo as { sourceUri: { uri: string } }).sourceUri.uri).toBe(
      "https://cdn.example/avatar.webp",
    );
  });

  it("omits unsafe website links and empty modules stay valid", () => {
    const object = buildGoogleWalletObject(
      { ...BASE, website: "data:text/html,x", phone: null, email: null },
      IDENTITY,
      null,
      "123",
    );
    const uris = (object.linksModuleData as { uris: { uri: string }[] }).uris.map((u) => u.uri);
    expect(uris).not.toContain("data:text/html,x");
    expect(uris).toContain(IDENTITY);
    expect(object.textModulesData).toEqual([]);
    expect(object.logo).toBeUndefined();
  });
});

describe("signGoogleSaveJwt", () => {
  it("signs a verifiable save JWT with the required claims", async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
      modulusLength: 2048,
      extractable: true,
    });
    const config: GoogleWalletConfig = {
      issuerId: "123",
      serviceAccountEmail: "svc@example.iam.gserviceaccount.com",
      privateKey: await jose.exportPKCS8(privateKey),
    };
    const object = buildGoogleWalletObject(BASE, IDENTITY, null, config.issuerId);
    const jwt = await signGoogleSaveJwt(
      object,
      "https://karti.app",
      config,
      "key-id-1",
      1700000000,
    );
    const verified = await jose.jwtVerify(jwt, publicKey, { audience: "google" });
    expect(verified.payload.iss).toBe(config.serviceAccountEmail);
    expect((verified.payload as Record<string, unknown>).typ).toBe("savetowallet");
    expect(verified.payload.iat).toBe(1700000000);
    expect((verified.payload as Record<string, unknown>).origins).toEqual(["https://karti.app"]);
    const header = jose.decodeProtectedHeader(jwt);
    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe("key-id-1");
  });

  it("verifies end-to-end and omits kid when unset", async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
      modulusLength: 2048,
      extractable: true,
    });
    const pem = await jose.exportPKCS8(privateKey);
    const config: GoogleWalletConfig = {
      issuerId: "123",
      serviceAccountEmail: "svc@example.iam.gserviceaccount.com",
      privateKey: pem,
    };
    const object = buildGoogleWalletObject(BASE, IDENTITY, null, config.issuerId);
    const jwt = await signGoogleSaveJwt(object, "https://karti.app/", config, null);
    const verified = await jose.jwtVerify(jwt, publicKey, { audience: "google" });
    expect(verified.payload.iss).toBe(config.serviceAccountEmail);
    expect(jose.decodeProtectedHeader(jwt).kid).toBeUndefined();
    expect(googleSaveLink(jwt)).toBe(`${GOOGLE_SAVE_BASE}${jwt}`);
  });
});
