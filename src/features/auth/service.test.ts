import { describe, expect, it } from "vitest";
import { loginSchema, signInWithPassword } from "./service";

describe("loginSchema", () => {
  it("rejects empty email and password", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("accepts valid credentials shape", () => {
    const result = loginSchema.safeParse({ email: "admin@karti.app", password: "secret123" });
    expect(result.success).toBe(true);
  });
});

describe("signInWithPassword validation", () => {
  it("returns field errors without touching Supabase", async () => {
    const result = await signInWithPassword({ email: "bad", password: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Check the highlighted fields.");
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });
});
