import { describe, expect, it } from "vitest";
import { profileSchema, profileStatusSchema } from "./schema";

const VALID = {
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: "Developer",
  company_name: "Karti",
  bio: "Short bio.",
  phone: "+212600000000",
  whatsapp: "+212600000000",
  email: "ahmed@example.com",
  website: "https://example.com",
  address: "Marrakech",
  maps_url: "https://maps.google.com/?q=marrakech",
  accent_color: "#0e7c5b",
  theme: "light",
  avatar_path: "",
  cover_path: "",
} as const;

describe("profileSchema type + name", () => {
  it("accepts PERSON", () => {
    expect(profileSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts BUSINESS", () => {
    expect(profileSchema.safeParse({ ...VALID, profile_type: "BUSINESS" }).success).toBe(true);
  });

  it("rejects an invalid profile type", () => {
    const result = profileSchema.safeParse({ ...VALID, profile_type: "ALIEN" });
    expect(result.success).toBe(false);
  });

  it("requires a display name", () => {
    const result = profileSchema.safeParse({ ...VALID, display_name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "display_name")).toBe(true);
    }
  });
});

describe("profileSchema slug", () => {
  it("normalizes the slug", () => {
    const result = profileSchema.safeParse({ ...VALID, slug: "  Ahmed Benali! " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.slug).toBe("ahmed-benali");
  });

  it("rejects reserved slugs", () => {
    const result = profileSchema.safeParse({ ...VALID, slug: "login" });
    expect(result.success).toBe(false);
  });

  it("rejects empty normalized slugs", () => {
    const result = profileSchema.safeParse({ ...VALID, slug: "!!!" });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema contact + appearance", () => {
  it("rejects an invalid email", () => {
    expect(profileSchema.safeParse({ ...VALID, email: "nope" }).success).toBe(false);
  });

  it("accepts empty optional contact fields as null", () => {
    const result = profileSchema.safeParse({
      ...VALID,
      phone: "",
      whatsapp: "",
      email: "",
      website: "",
      address: "",
      maps_url: "",
      job_title: "",
      company_name: "",
      bio: "",
      accent_color: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.website).toBeNull();
      expect(result.data.accent_color).toBeNull();
    }
  });

  it("rejects unsafe website URLs", () => {
    expect(profileSchema.safeParse({ ...VALID, website: "javascript:alert(1)" }).success).toBe(
      false,
    );
  });

  it("rejects unsafe maps URLs", () => {
    expect(profileSchema.safeParse({ ...VALID, maps_url: "data:text/html,hi" }).success).toBe(
      false,
    );
  });

  it("accepts a valid accent color and lowercases it", () => {
    const result = profileSchema.safeParse({ ...VALID, accent_color: "#0E7C5B" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accent_color).toBe("#0e7c5b");
  });

  it("rejects an invalid accent color", () => {
    expect(profileSchema.safeParse({ ...VALID, accent_color: "red" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...VALID, accent_color: "#fff" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...VALID, accent_color: "expression(x)" }).success).toBe(
      false,
    );
  });

  it("accepts light and dark themes only", () => {
    expect(profileSchema.safeParse({ ...VALID, theme: "dark" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...VALID, theme: "neon" }).success).toBe(false);
  });
});

describe("profileSchema asset paths", () => {
  const generated = "profiles/123e4567-e89b-12d3-a456-426614174001/avatar/4f03b4e752f6ee3c.jpg";

  it("accepts empty paths as null", () => {
    const result = profileSchema.safeParse({ ...VALID, avatar_path: "", cover_path: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatar_path).toBeNull();
      expect(result.data.cover_path).toBeNull();
    }
  });

  it("accepts server-generated avatar/cover paths", () => {
    const cover = generated.replace("/avatar/", "/cover/").replace(".jpg", ".webp");
    const result = profileSchema.safeParse({ ...VALID, avatar_path: generated, cover_path: cover });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatar_path).toBe(generated);
      expect(result.data.cover_path).toBe(cover);
    }
  });

  it("accepts the pending segment used by pre-create uploads", () => {
    const pending = "profiles/pending/cover/4f03b4e752f6ee3c.png";
    const result = profileSchema.safeParse({ ...VALID, cover_path: pending });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.cover_path).toBe(pending);
  });

  it("rejects crafted paths and URLs", () => {
    for (const bad of [
      "profiles/../secrets/x.jpg",
      "profiles/NOT-A-HEX-ID/avatar/4f03b4e752f6ee3c.jpg",
      "profiles/abc/avatar/4f03b4e752f6ee3c.exe",
      "https://evil.com/x.jpg",
      "/etc/passwd",
    ]) {
      expect(profileSchema.safeParse({ ...VALID, avatar_path: bad }).success).toBe(false);
    }
  });
});

describe("profileStatusSchema", () => {
  it("accepts DRAFT, ACTIVE, INACTIVE", () => {
    expect(profileStatusSchema.safeParse("DRAFT").success).toBe(true);
    expect(profileStatusSchema.safeParse("ACTIVE").success).toBe(true);
    expect(profileStatusSchema.safeParse("INACTIVE").success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(profileStatusSchema.safeParse("ARCHIVED").success).toBe(false);
  });
});
