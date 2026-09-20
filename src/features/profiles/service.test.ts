import { describe, expect, it, vi } from "vitest";
import { linkSchema } from "./links";
import {
  checkSlugAvailability,
  checkSlugAvailabilityInternal,
  createProfile,
  createProfileInternal,
  ensureUniqueSlug,
  getProfileByClientId,
  getProfileByClientIdInternal,
  getProfileById,
  getProfileByIdInternal,
  setProfileStatus,
  setProfileStatusInternal,
  suggestSlug,
  updateProfile,
  updateProfileInternal,
  type ProfileDb,
} from "./service";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174001";

const VALID_INPUT = {
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: "",
  company_name: "",
  bio: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  address: "",
  maps_url: "",
  accent_color: "",
  theme: "light",
  avatar_path: "",
  cover_path: "",
};

/** Fake DB: configurable claims + table stubs. */
function fakeDb(
  options: {
    claims?: unknown;
    profiles?: unknown;
    queryError?: { code: string } | null;
  } = {},
): ProfileDb {
  const { claims = null, profiles = null, queryError = null } = options;
  const tableStub = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: null, error: queryError ?? { code: "PGRST116" } })),
    maybeSingle: vi.fn(async () => ({ data: profiles, error: queryError })),
  };
  return {
    auth: { getClaims: async () => ({ data: { claims }, error: null }) },
    from: vi.fn(() => tableStub),
  } as unknown as ProfileDb;
}

describe("suggestSlug", () => {
  it("derives slugs from names", () => {
    expect(suggestSlug("Ahmed Benali")).toBe("ahmed-benali");
    expect(suggestSlug("Café Atlas")).toBe("cafe-atlas");
  });

  it("falls back to profile for empty names", () => {
    expect(suggestSlug("!!!")).toBe("profile");
  });
});

describe("ensureUniqueSlug", () => {
  // The service awaits the query builder (thenable, like the real client).
  function thenableDb(takenCount: number): ProfileDb {
    let calls = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub: any = {};
    const chain = () => stub;
    stub.select = chain;
    stub.eq = chain;
    stub.neq = chain;
    stub.limit = chain;
    stub.then = (resolve: (v: unknown) => void) => {
      calls += 1;
      resolve(
        calls <= takenCount ? { data: [{ id: "other" }], error: null } : { data: [], error: null },
      );
    };
    return {
      auth: { getClaims: async () => ({ data: { claims: { sub: "a" } }, error: null }) },
      from: vi.fn(() => stub),
    } as unknown as ProfileDb;
  }

  it("returns the base when free", async () => {
    expect(await ensureUniqueSlug("ahmed-benali", thenableDb(0))).toBe("ahmed-benali");
  });

  it("appends a numeric suffix when taken", async () => {
    expect(await ensureUniqueSlug("ahmed-benali", thenableDb(2))).toBe("ahmed-benali-3");
  });
});

describe("checkSlugAvailability", () => {
  it("rejects reserved slugs without a session", async () => {
    const result = await checkSlugAvailability("login", fakeDb());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.available).toBe(false);
  });

  it("requires authentication for live checks", async () => {
    const result = await checkSlugAvailability("free-slug", fakeDb({ claims: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });
});

describe("createProfile guards", () => {
  it("rejects invalid input without querying", async () => {
    const from = vi.fn();
    const db = { ...(fakeDb({ claims: { sub: "a" } }) as object), from } as unknown as ProfileDb;
    const result = await createProfile(CLIENT_ID, { ...VALID_INPUT, display_name: "" }, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(from).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const result = await createProfile(CLIENT_ID, VALID_INPUT, fakeDb({ claims: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });

  it("refuses a second profile for the same client", async () => {
    const existing = { id: PROFILE_ID, client_id: CLIENT_ID };
    const db = fakeDb({ claims: { sub: "a" }, profiles: existing });
    // getProfileByClientId uses maybeSingle returning a single row or null
    (db.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: existing, error: null })),
    }));
    const result = await createProfile(CLIENT_ID, VALID_INPUT, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFLICT");
  });
});

describe("updateProfile relationship guard", () => {
  it("denies cross-client edits as not found", async () => {
    const otherClient = "123e4567-e89b-12d3-a456-426614174099";
    const db = fakeDb({ claims: { sub: "a" } });
    (db.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: { id: PROFILE_ID, client_id: otherClient },
        error: null,
      })),
    }));
    const result = await updateProfile(PROFILE_ID, CLIENT_ID, VALID_INPUT, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("setProfileStatus guards", () => {
  it("rejects invalid status values", async () => {
    const result = await setProfileStatus(
      PROFILE_ID,
      CLIENT_ID,
      "ARCHIVED",
      fakeDb({ claims: { sub: "a" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const result = await setProfileStatus(
      PROFILE_ID,
      CLIENT_ID,
      "ACTIVE",
      fakeDb({ claims: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });
});

describe("getProfileByClientId", () => {
  it("returns null when the client has no profile", async () => {
    const db = fakeDb({ claims: { sub: "a" }, profiles: null });
    (db.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }));
    const result = await getProfileByClientId(CLIENT_ID, db);
    expect(result).toEqual({ ok: true, data: null });
  });
});

describe("linkSchema", () => {
  it("accepts a valid link", () => {
    const result = linkSchema.safeParse({
      type: "instagram",
      label: "IG",
      url: "https://instagram.com/x",
      icon: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.url).toBe("https://instagram.com/x");
  });

  it("rejects unsafe URLs", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///x", "vbscript:x"]) {
      const result = linkSchema.safeParse({ type: "custom", label: "X", url, icon: "" });
      expect(result.success).toBe(false);
    }
  });

  it("requires a label and a known type", () => {
    expect(
      linkSchema.safeParse({ type: "nope", label: "X", url: "https://x.com", icon: "" }).success,
    ).toBe(false);
    expect(
      linkSchema.safeParse({ type: "website", label: "", url: "https://x.com", icon: "" }).success,
    ).toBe(false);
  });
});

describe("skipAuth pre-verified path (Track A)", () => {
  function claimsSpyDb(claims: unknown, fromImpl: () => unknown): {
    db: ProfileDb;
    getClaims: ReturnType<typeof vi.fn>;
  } {
    const getClaims = vi.fn(async () => ({ data: { claims }, error: null }));
    const db = { auth: { getClaims }, from: vi.fn(fromImpl) } as unknown as ProfileDb;
    return { db, getClaims };
  }

  it("getProfileByIdInternal bypasses auth when skipAuth:true", async () => {
    const row = { id: PROFILE_ID, client_id: CLIENT_ID, slug: "ahmed-benali" };
    const { db, getClaims } = claimsSpyDb(null, () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    }));
    const result = await getProfileByIdInternal(PROFILE_ID, db, { skipAuth: true });
    expect(result.ok).toBe(true);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("public getProfileById still requires auth", async () => {
    const { db, getClaims } = claimsSpyDb(null, () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }));
    const result = await getProfileById(PROFILE_ID, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(getClaims).toHaveBeenCalled();
  });

  it("getProfileByClientIdInternal bypasses auth when skipAuth:true", async () => {
    const { db, getClaims } = claimsSpyDb(null, () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }));
    const result = await getProfileByClientIdInternal(CLIENT_ID, db, { skipAuth: true });
    expect(result).toEqual({ ok: true, data: null });
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("checkSlugAvailabilityInternal bypasses auth when skipAuth:true", async () => {
    // Thenable stub (like the real query builder): direct await resolves availability.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub: any = {};
    const chain = () => stub;
    stub.select = chain;
    stub.eq = chain;
    stub.neq = chain;
    stub.limit = chain;
    stub.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };
    const { db, getClaims } = claimsSpyDb(null, () => stub);
    const result = await checkSlugAvailabilityInternal("free-slug", db, undefined, {
      skipAuth: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.available).toBe(true);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("createProfileInternal with skipAuth:true makes zero getClaims calls", async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: null }, error: null }));
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({
        data: { id: PROFILE_ID, client_id: CLIENT_ID, slug: "ahmed-benali" },
        error: null,
      })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      // Slug-availability direct await resolves free.
      then: (resolve: (v: unknown) => void) => {
        resolve({ data: [], error: null });
      },
    }));
    const db = { auth: { getClaims }, from } as unknown as ProfileDb;
    const result = await createProfileInternal(CLIENT_ID, VALID_INPUT, db, undefined, {
      skipAuth: true,
    });
    expect(result.ok).toBe(true);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("setProfileStatusInternal with skipAuth:true makes zero getClaims calls", async () => {
    const row = {
      id: PROFILE_ID,
      client_id: CLIENT_ID,
      slug: "ahmed-benali",
      display_name: "Ahmed Benali",
    };
    const updated = { ...row, status: "ACTIVE" };
    let calls = 0;
    const getClaims = vi.fn(async () => ({ data: { claims: null }, error: null }));
    const from = vi.fn(() => {
      calls += 1;
      const isFirst = calls === 1;
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: isFirst ? row : updated, error: null })),
      };
    });
    const db = { auth: { getClaims }, from } as unknown as ProfileDb;
    const result = await setProfileStatusInternal(PROFILE_ID, CLIENT_ID, "ACTIVE", db, {
      skipAuth: true,
    });
    expect(result.ok).toBe(true);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("updateProfile skips the slug-availability query when the slug is unchanged", async () => {
    const current = { id: PROFILE_ID, client_id: CLIENT_ID, slug: "ahmed-benali" };
    const updated = { ...current, display_name: "Ahmed Benali" };
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "a" } }, error: null }));
    let calls = 0;
    const from = vi.fn(() => {
      calls += 1;
      // First call: getProfileByIdInternal → current row.
      if (calls === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: current, error: null })),
        };
      }
      // Second call doubles as update + (hypothetical) slug check:
      // - direct await (slug-check pattern) resolves TAKEN → would force CONFLICT if queried;
      // - maybeSingle (update pattern) resolves the updated row.
      // Correct skip behavior hits maybeSingle → ok:true. An extra slug query would hit
      // the taken stub → CONFLICT, failing this test.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stub: any = {};
      const chain = () => stub;
      stub.select = chain;
      stub.update = chain;
      stub.eq = chain;
      stub.neq = chain;
      stub.limit = chain;
      stub.maybeSingle = vi.fn(async () => ({ data: updated, error: null }));
      stub.then = (resolve: (v: unknown) => void) => {
        resolve({ data: [{ id: "other-profile" }], error: null });
      };
      return stub;
    });
    const db = { auth: { getClaims }, from } as unknown as ProfileDb;
    const result = await updateProfileInternal(PROFILE_ID, CLIENT_ID, VALID_INPUT, db, {
      skipAuth: true,
    });
    expect(result.ok).toBe(true);
    // Exactly get + update — no slug-availability round-trip.
    expect(from).toHaveBeenCalledTimes(2);
  });
});
