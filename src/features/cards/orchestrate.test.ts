import { describe, expect, it, vi } from "vitest";
import { configureCardForClient, pickPrimaryCard } from "./orchestrate";
import type { CardDb } from "./service";
import type { CardSummary } from "./types";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174001";

type Row = Record<string, unknown>;

function summary(overrides: Partial<Row> & { id: string }): CardSummary {
  return {
    card_number: "KARTI-000001",
    short_code: "ABCDEFGH",
    status: "ASSIGNED",
    destination_type: null,
    created_at: "2026-01-01T00:00:00.000Z",
    clients: { id: CLIENT_ID, name: "Client" },
    ...overrides,
  } as CardSummary;
}

/** Minimal in-memory PostgREST stand-in shared across from() calls. */
function fakeDb(store: { clients: Row[]; profiles: Row[]; cards: Row[] }, authed = true): CardDb {
  function table(tableName: "clients" | "profiles" | "cards") {
    const rows = store[tableName];
    const filters: ((r: Row) => boolean)[] = [];
    let orderKey: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;
    let mode: "select" | "insert" | "update" = "select";
    let payload: Row = {};
    const apply = () => {
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (orderKey) {
        const key = orderKey;
        out = [...out].sort((a, b) =>
          String(a[key]) < String(b[key])
            ? orderAsc
              ? -1
              : 1
            : String(a[key]) > String(b[key])
              ? orderAsc
                ? 1
                : -1
              : 0,
        );
      }
      if (limitN !== null) out = out.slice(0, limitN);
      return out;
    };
    const api: Record<string, unknown> = {};
    api.select = vi.fn(() => api);
    api.eq = vi.fn((col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return api;
    });
    api.neq = vi.fn(() => api);
    api.or = vi.fn(() => api);
    api.in = vi.fn(() => api);
    api.is = vi.fn(() => api);
    api.order = vi.fn((key: string, opts?: { ascending: boolean }) => {
      orderKey = key;
      orderAsc = opts?.ascending ?? true;
      return api;
    });
    api.limit = vi.fn((n: number) => {
      limitN = n;
      return api;
    });
    api.insert = vi.fn((row: Row) => {
      mode = "insert";
      payload = row;
      return api;
    });
    api.update = vi.fn((row: Row) => {
      mode = "update";
      payload = row;
      return api;
    });
    const finishOne = async () => {
      if (mode === "insert") {
        const created: Row = {
          id: `123e4567-e89b-12d3-a456-42661417${String(4100 + rows.length).slice(-4)}`,
          card_number: `KARTI-00000${rows.length + 1}`,
          status: "UNASSIGNED",
          client_id: null,
          destination_type: null,
          destination_profile_id: null,
          destination_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        };
        rows.push(created);
        return { data: created, error: null };
      }
      const matched = apply();
      if (mode === "update") {
        for (const r of matched) Object.assign(r, payload);
      }
      return { data: matched[0] ?? null, error: null };
    };
    api.single = vi.fn(finishOne);
    api.maybeSingle = vi.fn(finishOne);
    api.then = (resolve: (v: unknown) => void) => {
      resolve({ data: apply(), error: null });
    };
    return api;
  }
  return {
    auth: {
      getClaims: async () =>
        authed
          ? { data: { claims: { sub: "admin" } }, error: null }
          : { data: { claims: null }, error: null },
    },
    from: vi.fn((name: "clients" | "profiles" | "cards") => table(name)),
  } as unknown as CardDb;
}

const ACTIVE_PROFILE: Row = {
  id: PROFILE_ID,
  client_id: CLIENT_ID,
  profile_type: "PERSON",
  slug: "test-person",
  display_name: "Test Person",
  status: "ACTIVE",
};

describe("pickPrimaryCard", () => {
  const a = (id: string, status: string, created: string) =>
    summary({ id, status, created_at: created });

  it("returns null when empty", () => {
    expect(pickPrimaryCard([])).toBeNull();
  });

  it("prefers ACTIVE, then newest usable", () => {
    const cards = [
      a("old-active", "ACTIVE", "2026-01-01T00:00:00.000Z"),
      a("new-assigned", "ASSIGNED", "2026-03-01T00:00:00.000Z"),
      a("new-active", "ACTIVE", "2026-05-01T00:00:00.000Z"),
    ];
    expect(pickPrimaryCard(cards)?.id).toBe("new-active");
    expect(
      pickPrimaryCard(cards.filter((c) => c.id !== "new-active" && c.id !== "old-active"))?.id,
    ).toBe("new-assigned");
  });

  it("falls back to retired cards only when nothing usable exists", () => {
    const cards = [
      a("lost", "LOST", "2026-02-01T00:00:00.000Z"),
      a("replaced", "REPLACED", "2026-04-01T00:00:00.000Z"),
    ];
    expect(pickPrimaryCard(cards)?.id).toBe("replaced");
  });
});

describe("configureCardForClient", () => {
  function storeWithProfile(status = "ACTIVE") {
    return {
      clients: [{ id: CLIENT_ID, name: "Client" }],
      profiles: [{ ...ACTIVE_PROFILE, status }],
      cards: [] as Row[],
    };
  }

  it("requires authentication", async () => {
    const store = storeWithProfile();
    const result = await configureCardForClient(
      CLIENT_ID,
      { kind: "PROFILE" },
      fakeDb(store, false),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(store.cards).toHaveLength(0);
  });

  it("auto-creates, assigns, points at PROFILE, and activates", async () => {
    const store = storeWithProfile();
    const db = fakeDb(store);
    const result = await configureCardForClient(CLIENT_ID, { kind: "PROFILE" }, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reused).toBe(false);
    expect(result.data.card.client_id).toBe(CLIENT_ID);
    expect(result.data.card.destination_type).toBe("PROFILE");
    expect(result.data.card.destination_profile_id).toBe(PROFILE_ID);
    expect(result.data.card.status).toBe("ACTIVE");
    expect(result.data.permanentUrl.endsWith(`/t/${result.data.card.short_code}`)).toBe(true);
    expect(store.cards).toHaveLength(1);
  });

  it("auto-creates with an EXTERNAL_URL destination", async () => {
    const store = storeWithProfile();
    const db = fakeDb(store);
    const result = await configureCardForClient(
      CLIENT_ID,
      { kind: "EXTERNAL_URL", url: "https://instagram.com/x" },
      db,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.card.destination_type).toBe("EXTERNAL_URL");
    expect(result.data.card.destination_url).toBe("https://instagram.com/x");
    expect(result.data.card.status).toBe("ACTIVE");
  });

  it("rejects a missing profile without creating a card", async () => {
    const store = { clients: [{ id: CLIENT_ID, name: "C" }], profiles: [], cards: [] as Row[] };
    const result = await configureCardForClient(CLIENT_ID, { kind: "PROFILE" }, fakeDb(store));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NO_PROFILE");
    expect(store.cards).toHaveLength(0);
  });

  it("rejects an inactive profile without creating a card", async () => {
    const store = storeWithProfile("DRAFT");
    const result = await configureCardForClient(CLIENT_ID, { kind: "PROFILE" }, fakeDb(store));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROFILE_NOT_ACTIVE");
    expect(store.cards).toHaveLength(0);
  });

  it("rejects unsafe external URLs without creating a card", async () => {
    const store = storeWithProfile();
    const result = await configureCardForClient(
      CLIENT_ID,
      { kind: "EXTERNAL_URL", url: "javascript:alert(1)" },
      fakeDb(store),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_URL");
    expect(store.cards).toHaveLength(0);
  });

  it("reuses the existing card and preserves its identity on switch", async () => {
    const store = storeWithProfile();
    const db = fakeDb(store);
    const first = await configureCardForClient(CLIENT_ID, { kind: "PROFILE" }, db);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const { id, card_number, short_code } = first.data.card;

    const second = await configureCardForClient(
      CLIENT_ID,
      { kind: "EXTERNAL_URL", url: "https://g.page/review" },
      db,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.reused).toBe(true);
    expect(second.data.card.id).toBe(id);
    expect(second.data.card.card_number).toBe(card_number);
    expect(second.data.card.short_code).toBe(short_code);
    expect(second.data.card.destination_type).toBe("EXTERNAL_URL");

    const third = await configureCardForClient(CLIENT_ID, { kind: "PROFILE" }, db);
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.data.card.id).toBe(id);
    expect(third.data.card.destination_type).toBe("PROFILE");
    expect(third.data.card.destination_url).toBeNull();
    expect(store.cards).toHaveLength(1);
  });

  it("returns NOT_FOUND for unknown clients", async () => {
    const store = storeWithProfile();
    const result = await configureCardForClient(
      "123e4567-e89b-12d3-a456-426614174099",
      { kind: "PROFILE" },
      fakeDb(store),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
