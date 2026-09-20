import { describe, expect, it } from "vitest";
import { clientSchema, quickAddSchema } from "./schema";

describe("clientSchema name", () => {
  it("requires a name", () => {
    const result = clientSchema.safeParse({
      name: "",
      company: "",
      phone: "",
      email: "",
      notes: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "name")).toBe(true);
    }
  });

  it("rejects whitespace-only names", () => {
    const result = clientSchema.safeParse({
      name: "   ",
      company: "",
      phone: "",
      email: "",
      notes: "",
    });
    expect(result.success).toBe(false);
  });

  it("trims the name", () => {
    const result = clientSchema.safeParse({
      name: "  Younes  ",
      company: "",
      phone: "",
      email: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Younes");
  });

  it("rejects overlong names", () => {
    const result = clientSchema.safeParse({
      name: "x".repeat(121),
      company: "",
      phone: "",
      email: "",
      notes: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("clientSchema optional fields", () => {
  const base = { name: "Younes", company: "", phone: "", email: "", notes: "" };

  it("normalizes empty optionals to null", () => {
    const result = clientSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepts international phone formats", () => {
    for (const phone of [
      "+212 6 12 34 56 78",
      "0612345678",
      "+33 6 12 34 56 78",
      "(212) 612-345678",
    ]) {
      const result = clientSchema.safeParse({ ...base, phone });
      expect(result.success).toBe(true);
    }
  });

  it("rejects phone with letters", () => {
    const result = clientSchema.safeParse({ ...base, phone: "call me" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid optional email and lowercases it", () => {
    const result = clientSchema.safeParse({ ...base, email: "  Admin@Karti.App " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("admin@karti.app");
  });

  it("rejects an invalid email", () => {
    const result = clientSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects overlong notes", () => {
    const result = clientSchema.safeParse({ ...base, notes: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe("quickAddSchema", () => {
  it("accepts name + phone", () => {
    const result = quickAddSchema.safeParse({ name: "Sara", company: "", phone: "+212600000000" });
    expect(result.success).toBe(true);
  });

  it("still requires a name", () => {
    const result = quickAddSchema.safeParse({ name: "", company: "", phone: "+212600000000" });
    expect(result.success).toBe(false);
  });
});
