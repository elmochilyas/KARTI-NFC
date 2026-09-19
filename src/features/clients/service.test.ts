import { describe, expect, it, vi } from "vitest";
import {
  createClient,
  escapeLikePattern,
  getClientById,
  listClients,
  updateClient,
} from "./service";
import type { ClientDb } from "./service";

/** Fake DB that fails loudly if queried — for paths that must not reach Supabase. */
function strictFakeDb(claims: unknown = null): ClientDb {
  return {
    auth: {
      getClaims: async () => ({ data: { claims }, error: null }),
    },
    from: () => {
      throw new Error("database must not be queried on this path");
    },
  } as unknown as ClientDb;
}

describe("escapeLikePattern", () => {
  it("escapes %, _, and backslash", () => {
    expect(escapeLikePattern("100%_x\\y")).toBe("100\\%\\_x\\\\y");
  });
});

describe("createClient authorization + validation", () => {
  it("returns field errors without querying on invalid input", async () => {
    const from = vi.fn();
    const db = { ...strictFakeDb(), from } as unknown as ClientDb;
    const result = await createClient({ name: "" }, db);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.name).toBeDefined();
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("requires authentication for valid input", async () => {
    const result = await createClient(
      { name: "Younes", company: "", phone: "", email: "", notes: "" },
      strictFakeDb(null),
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sign in to manage clients." },
    });
  });
});

describe("updateClient guards", () => {
  it("returns NOT_FOUND for malformed ids without querying", async () => {
    const from = vi.fn();
    const db = { ...strictFakeDb({ sub: "admin" }), from } as unknown as ClientDb;
    const result = await updateClient("not-a-uuid", { name: "Younes" }, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    expect(from).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const result = await updateClient(
      "123e4567-e89b-12d3-a456-426614174000",
      { name: "Y", company: "", phone: "", email: "", notes: "" },
      strictFakeDb(null),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });
});

describe("getClientById guards", () => {
  it("returns NOT_FOUND for malformed ids without querying", async () => {
    const result = await getClientById("nope", strictFakeDb({ sub: "admin" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("listClients authorization", () => {
  it("requires authentication", async () => {
    const result = await listClients({ query: "atlas" }, strictFakeDb(null));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });
});
