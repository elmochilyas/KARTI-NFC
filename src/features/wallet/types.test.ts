import { describe, expect, it } from "vitest";
import { sanitizeWalletField, toPublicWalletData, MAX_WALLET_FIELD_LENGTH } from "./types";

describe("sanitizeWalletField", () => {
  it("trims and drops empties", () => {
    expect(sanitizeWalletField("  Atlas Studio  ")).toBe("Atlas Studio");
    expect(sanitizeWalletField("   ")).toBeNull();
    expect(sanitizeWalletField(null)).toBeNull();
    expect(sanitizeWalletField(42)).toBeNull();
  });

  it("strips CR/LF/NULL and control characters (injection hygiene)", () => {
    expect(sanitizeWalletField("Name\r\nInjected: evil")).toBe("NameInjected: evil");
    expect(sanitizeWalletField("a\u0000b\u007fc")).toBe("abc");
    expect(sanitizeWalletField("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });

  it("truncates to the cap", () => {
    expect(MAX_WALLET_FIELD_LENGTH).toBe(120);
    expect(sanitizeWalletField("x".repeat(200))).toHaveLength(120);
    expect(sanitizeWalletField("x".repeat(200), 10)).toHaveLength(10);
  });
});

describe("toPublicWalletData", () => {
  it("projects only wallet-safe fields (no admin data)", () => {
    const data = toPublicWalletData({
      id: "uuid",
      profile_type: "PERSON",
      slug: "ahmed-benali",
      public_code: "ABCD234567",
      display_name: "Ahmed Benali",
      job_title: "Dev",
      company_name: "Atlas",
      bio: "Bio stays out.",
      avatar_path: "profiles/x/avatar/y.webp",
      cover_path: "profiles/x/cover/y.webp",
      phone: "+2121",
      whatsapp: "+2122",
      email: "a@x.com",
      website: "https://atlas.ma",
      address: "Addr stays out.",
      maps_url: "https://maps.example",
      accent_color: "#0e7c5b",
      theme: "light",
    });
    expect(data).toEqual({
      publicCode: "ABCD234567",
      slug: "ahmed-benali",
      displayName: "Ahmed Benali",
      jobTitle: "Dev",
      companyName: "Atlas",
      phone: "+2121",
      email: "a@x.com",
      website: "https://atlas.ma",
      avatarPath: "profiles/x/avatar/y.webp",
      accentColor: "#0e7c5b",
    });
    expect(data).not.toHaveProperty("bio");
    expect(data).not.toHaveProperty("address");
    expect(data).not.toHaveProperty("cover_path");
  });
});
