import { describe, expect, it, vi } from "vitest";
import {
  assignCardToClient,
  checkActivationReadiness,
  createCard,
  permanentCardUrl,
  setCardDestinationToExternalUrl,
  setCardDestinationToProfile,
  setCardStatus,
  unassignCard,
  type CardDb,
} from "./service";

const CARD_ID = "123e4567-e89b-12d3-a456-426614174000";
const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_CLIENT = "123e4567-e89b-12d3-a456-426614174002";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";

const BASE_CARD = {
  id: CARD_ID,
  card_number: "KARTI-000001",
  short_code: "ABCDEFGH",
  client_id: null,
  destination_type: null,
  destination_profile_id: null,
  destination_url: null,
  status: "UNASSIGNED",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Fake DB with canned claims + programmable table behavior. */
function fakeDb(
  options: {
    claims?: unknown;
    singleRow?: unknown;
    singleError?: { code: string; message: string } | null;
    maybeRow?: unknown;
    onInsert?: (row: unknown) => { data: unknown; error: { code: string } | null };
  } = {},
): CardDb {
  const {
    claims = null,
    singleRow = null,
    singleError = null,
    maybeRow = null,
    onInsert,
  } = options;
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.single = vi.fn(async () => ({ data: singleRow, error: singleError }));
  chain.insert = vi.fn((row: unknown) => {
    const outcome = onInsert ? onInsert(row) : { data: singleRow, error: singleError };
    const single = vi.fn(async () => outcome);
    return { ...chain, select: vi.fn(() => ({ ...chain, single })) };
  });
  chain.update = vi.fn(() => ({
    ...chain,
    eq: vi.fn(() => ({
      ...chain,
      select: vi.fn(() => ({
        ...chain,
        maybeSingle: vi.fn(async () => ({ data: maybeRow, error: singleError })),
      })),
    })),
  }));
  chain.delete = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: maybeRow, error: singleError }));
  chain.then = (resolve: (v: unknown) => void) => {
    resolve({ data: [], error: null });
  };
  return {
    auth: { getClaims: async () => ({ data: { claims }, error: null }) },
    from: vi.fn(() => chain),
  } as unknown as CardDb;
}

describe("permanentCardUrl", () => {
  it("builds the permanent URL from the canonical app URL", () => {
    expect(permanentCardUrl("K7DX29P4").endsWith("/t/K7DX29P4")).toBe(true);
  });
});

describe("checkActivationReadiness", () => {
  const base = { ...BASE_CARD };

  it("rejects ownerless cards", () => {
    expect(checkActivationReadiness(base, null)).toEqual({
      ok: false,
      message: "Assign the card to a client before activating it.",
    });
  });

  it("rejects missing destinations", () => {
    expect(checkActivationReadiness({ ...base, client_id: CLIENT_ID }, null)).toEqual({
      ok: false,
      message: "Configure a destination before activating.",
    });
  });

  it("rejects PROFILE destinations without a profile", () => {
    expect(
      checkActivationReadiness(
        { ...base, client_id: CLIENT_ID, destination_type: "PROFILE", destination_profile_id: "x" },
        null,
      ),
    ).toEqual({ ok: false, message: "The destination profile no longer exists." });
  });

  it("rejects cross-client profiles", () => {
    expect(
      checkActivationReadiness(
        {
          ...base,
          client_id: CLIENT_ID,
          destination_type: "PROFILE",
          destination_profile_id: PROFILE_ID,
        },
        { client_id: OTHER_CLIENT, status: "ACTIVE" },
      ),
    ).toEqual({ ok: false, message: "The destination profile belongs to a different client." });
  });

  it("rejects inactive profiles", () => {
    expect(
      checkActivationReadiness(
        {
          ...base,
          client_id: CLIENT_ID,
          destination_type: "PROFILE",
          destination_profile_id: PROFILE_ID,
        },
        { client_id: CLIENT_ID, status: "DRAFT" },
      ),
    ).toEqual({ ok: false, message: "The destination profile is not active." });
  });

  it("accepts valid PROFILE cards", () => {
    expect(
      checkActivationReadiness(
        {
          ...base,
          client_id: CLIENT_ID,
          destination_type: "PROFILE",
          destination_profile_id: PROFILE_ID,
        },
        { client_id: CLIENT_ID, status: "ACTIVE" },
      ),
    ).toEqual({ ok: true });
  });

  it("accepts valid EXTERNAL_URL cards and rejects bad URLs", () => {
    expect(
      checkActivationReadiness(
        {
          ...base,
          client_id: CLIENT_ID,
          destination_type: "EXTERNAL_URL",
          destination_url: "https://x.com",
        },
        null,
      ),
    ).toEqual({ ok: true });
    expect(
      checkActivationReadiness(
        {
          ...base,
          client_id: CLIENT_ID,
          destination_type: "EXTERNAL_URL",
          destination_url: "javascript:x",
        },
        null,
      ),
    ).toEqual({ ok: false, message: "Set a valid external URL before activating." });
  });
});

describe("createCard guards", () => {
  it("requires authentication without touching the DB", async () => {
    const from = vi.fn();
    const db = { ...(fakeDb() as object), from } as unknown as CardDb;
    const result = await createCard(db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(from).not.toHaveBeenCalled();
  });

  it("retries short-code collisions then succeeds", async () => {
    let calls = 0;
    const db = fakeDb({
      claims: { sub: "admin" },
      onInsert: () => {
        calls += 1;
        return calls === 1
          ? { data: null, error: { code: "23505" } }
          : { data: { ...BASE_CARD }, error: null };
      },
    });
    const result = await createCard(db);
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

describe("assignment guards", () => {
  function assignedCardDb(card: unknown, clientExists: boolean): CardDb {
    const db = fakeDb({ claims: { sub: "admin" } });
    (db.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === "cards") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: card, error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({
          data: clientExists ? { id: CLIENT_ID } : null,
          error: null,
        })),
      };
    });
    return db;
  }

  it("rejects invalid client ids", async () => {
    const result = await assignCardToClient(
      CARD_ID,
      "not-a-uuid",
      fakeDb({ claims: { sub: "admin" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unknown clients", async () => {
    const result = await assignCardToClient(CARD_ID, CLIENT_ID, assignedCardDb(BASE_CARD, false));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("rejects reassigning ACTIVE cards", async () => {
    const result = await assignCardToClient(
      CARD_ID,
      CLIENT_ID,
      assignedCardDb({ ...BASE_CARD, status: "ACTIVE", client_id: OTHER_CLIENT }, true),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const result = await assignCardToClient(CARD_ID, CLIENT_ID, fakeDb({ claims: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });

  it("refuses to unassign ACTIVE cards", async () => {
    const db = fakeDb({ claims: { sub: "admin" } });
    (db.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: { ...BASE_CARD, status: "ACTIVE", client_id: CLIENT_ID },
        error: null,
      })),
    }));
    const result = await unassignCard(CARD_ID, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("destination guards", () => {
  function cardWithOwnerDb(card: unknown, profile: unknown): CardDb {
    const db = fakeDb({ claims: { sub: "admin" } });
    (db.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: profile, error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: card, error: null })),
      };
    });
    return db;
  }

  it("rejects cross-client profiles", async () => {
    const result = await setCardDestinationToProfile(
      CARD_ID,
      CLIENT_ID,
      PROFILE_ID,
      cardWithOwnerDb(
        { ...BASE_CARD, client_id: CLIENT_ID },
        { id: PROFILE_ID, client_id: OTHER_CLIENT },
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.message).toBe("That profile belongs to a different client.");
  });

  it("requires prior assignment for profile destinations", async () => {
    const result = await setCardDestinationToProfile(
      CARD_ID,
      CLIENT_ID,
      PROFILE_ID,
      cardWithOwnerDb({ ...BASE_CARD, client_id: null }, { id: PROFILE_ID, client_id: CLIENT_ID }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsafe external URLs", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///x"]) {
      const result = await setCardDestinationToExternalUrl(
        CARD_ID,
        url,
        fakeDb({ claims: { sub: "admin" } }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("setCardStatus guards", () => {
  it("rejects invalid statuses", async () => {
    const result = await setCardStatus(CARD_ID, "BROKEN", fakeDb({ claims: { sub: "admin" } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const result = await setCardStatus(CARD_ID, "DISABLED", fakeDb({ claims: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed ids without querying", async () => {
    const from = vi.fn();
    const db = { ...(fakeDb({ claims: { sub: "admin" } }) as object), from } as unknown as CardDb;
    const result = await setCardStatus("nope", "DISABLED", db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    expect(from).not.toHaveBeenCalled();
  });
});
