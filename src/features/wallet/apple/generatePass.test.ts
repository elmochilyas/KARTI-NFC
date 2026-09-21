import { describe, expect, it } from "vitest";
import { appleBackgroundColor, applePassFilename, buildApplePassModel } from "./generatePass";
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

const IDENTITY = "https://karti.app/u/ABCD234567";
const CONFIG = { passTypeId: "pass.app.karti.card", teamId: "TEAM123" };

describe("buildApplePassModel", () => {
  it("builds a generic pass with identity barcode and stable serial", () => {
    const model = buildApplePassModel(BASE, IDENTITY, CONFIG);
    expect(model.formatVersion).toBe(1);
    expect(model.passTypeIdentifier).toBe(CONFIG.passTypeId);
    expect(model.teamIdentifier).toBe(CONFIG.teamId);
    expect(model.serialNumber).toBe("karti-ABCD234567");
    expect(model.organizationName).toBe("Atlas Studio");
    expect(model.backgroundColor).toBe("rgb(14, 124, 91)");
    const generic = model.generic as Record<string, { key: string; value: string }[]>;
    expect(generic.primaryFields[0]).toMatchObject({ key: "name", value: "Ahmed Benali" });
    const barcodes = model.barcodes as { format: string; message: string }[];
    expect(barcodes).toHaveLength(1);
    expect(barcodes[0].format).toBe("PKBarcodeFormatQR");
    expect(barcodes[0].message).toBe(IDENTITY);
    expect(barcodes[0].message).not.toContain("/t/");
  });

  it("omits missing data without empty fields", () => {
    const model = buildApplePassModel(
      { ...BASE, jobTitle: null, companyName: null, phone: null, email: null, website: null },
      IDENTITY,
      CONFIG,
    );
    const generic = model.generic as Record<string, unknown[]>;
    expect(generic.secondaryFields).toEqual([]);
    expect(generic.auxiliaryFields).toEqual([]);
    // Website gone, but profile + issuer back fields remain.
    expect((generic.backFields as { key: string }[]).map((f) => f.key)).toEqual([
      "profile",
      "issuer",
    ]);
  });

  it("neutralizes hostile fields (CRLF stripped, unsafe URLs dropped)", () => {
    const model = buildApplePassModel(
      {
        ...BASE,
        displayName: "Evil\r\nInjected: yes",
        companyName: "Co\u0000mpany",
        website: "javascript:alert(1)",
      },
      IDENTITY,
      CONFIG,
    );
    const dumped = JSON.stringify(model);
    expect(dumped).not.toContain("\r");
    expect(dumped).not.toContain("\n");
    expect(dumped).not.toContain("\u0000");
    expect(dumped).not.toContain("javascript:");
    const generic = model.generic as Record<string, { key: string; value: string }[]>;
    expect(generic.primaryFields[0].value).toBe("EvilInjected: yes");
  });

  it("falls back safely for blank names and bad accents", () => {
    const model = buildApplePassModel(
      { ...BASE, displayName: "   ", accentColor: "red;evil" },
      IDENTITY,
      CONFIG,
    );
    const generic = model.generic as Record<string, { key: string; value: string }[]>;
    expect(generic.primaryFields[0].value).toBe("Karti Card");
    expect(model.backgroundColor).toBe("rgb(14, 124, 91)");
  });
});

describe("appleBackgroundColor", () => {
  it("converts hex accents and falls back", () => {
    expect(appleBackgroundColor("#ffffff")).toBe("rgb(255, 255, 255)");
    expect(appleBackgroundColor("#000000")).toBe("rgb(0, 0, 0)");
    expect(appleBackgroundColor("not-a-color")).toBe("rgb(14, 124, 91)");
    expect(appleBackgroundColor(null)).toBe("rgb(14, 124, 91)");
  });
});

describe("applePassFilename", () => {
  it("derives a safe slug filename", () => {
    expect(applePassFilename("ahmed-benali")).toBe("ahmed-benali.pkpass");
    expect(applePassFilename("")).toBe("karti-card.pkpass");
    const hostile = applePassFilename('a/b\\c"\r\n');
    expect(hostile).toBe("abc.pkpass");
    expect(hostile).not.toMatch(/[\r\n"/\\]/);
  });
});
