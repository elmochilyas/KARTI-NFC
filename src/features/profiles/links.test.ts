import { describe, expect, it, vi } from "vitest";
import { createProfileLink, reorderProfileLinks, toggleProfileLink, type LinksDb } from "./links";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_CLIENT = "123e4567-e89b-12d3-a456-426614174002";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";
const OTHER_PROFILE = "123e4567-e89b-12d3-a456-426614174004";
const LINK_A = "123e4567-e89b-12d3-a456-426614174011";
const LINK_B = "123e4567-e89b-12d3-a456-426614174012";
const LINK_C = "123e4567-e89b-12d3-a456-426614174013";

type Row = Record<string, unknown>;

type Store = { profiles: Row[]; links: Row[] };
type Stats = { maxInFlight: number; updateCalls: { id: unknown; patch: Row }[] };

function linkRow(id: string, sort: number, enabled = true): Row {
  return {
    id,
    profile_id: PROFILE_ID,
    type: "website",
    label: `Link ${id.slice(-4)}`,
    url: "https://example.com",
    icon: null,
    sort_order: sort,
    enabled,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function validInput() {
  return { type: "website", label: "Site", url: "https://example.com", icon: "" };
}

/** In-memory PostgREST stand-in with write-concurrency tracking. */
function fakeLinksDb(
  store: Store,
  stats: Stats,
  options: { authed?: boolean; failUpdate?: boolean } = {},
): LinksDb {
  const { authed = true, failUpdate = false } = options;
  let inFlight = 0;

  function table(name: "profiles" | "profile_links") {
    const rows = name === "profiles" ? store.profiles : store.links;
    const filters: ((r: Row) => boolean)[] = [];
    let selected: string | null = null;
    const orderKeys: { key: string; asc: boolean }[] = [];
    let limitN: number | null = null;
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row = {};

    const matched = () => {
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (orderKeys.length > 0) {
        const keys = [...orderKeys];
        out = [...out].sort((a, b) => {
          for (const { key, asc } of keys) {
            const av = a[key];
            const bv = b[key];
            let cmp: number;
            if (typeof av === "number" && typeof bv === "number") {
              cmp = av - bv;
            } else {
              cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
            }
            if (cmp !== 0) return asc ? cmp : -cmp;
          }
          return 0;
        });
      }
      if (limitN !== null) out = out.slice(0, limitN);
      return out;
    };

    const finishMaybeSingle = async () => {
      if (mode === "update") {
        const hit = matched();
        for (const r of hit) Object.assign(r, payload);
        return { data: hit[0] ?? null, error: null };
      }
      const hit = matched();
      if (name === "profile_links" && selected?.includes("profiles")) {
        const link = hit[0];
        if (!link) return { data: null, error: null };
        const owner = store.profiles.find((p) => p.id === link.profile_id);
        if (selected.includes("!inner") && !owner) return { data: null, error: null };
        return {
          data: { ...link, profiles: owner ? { client_id: owner.client_id } : null },
          error: null,
        };
      }
      return { data: hit[0] ?? null, error: null };
    };

    const api: Record<string, unknown> = {};
    api.select = vi.fn((cols?: string) => {
      selected = cols ?? null;
      return api;
    });
    api.eq = vi.fn((col: string, val: unknown) => {
      const key = col.includes(".") ? (col.split(".").pop() as string) : col;
      filters.push((r) => r[key] === val);
      return api;
    });
    api.order = vi.fn((key: string, opts?: { ascending: boolean }) => {
      orderKeys.push({ key, asc: opts?.ascending ?? true });
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
    api.delete = vi.fn(() => {
      mode = "delete";
      return api;
    });
    api.single = vi.fn(async () => {
      if (mode === "insert") {
        const created: Row = {
          id: `123e4567-e89b-12d3-a456-42661417${String(4200 + rows.length).slice(-4)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        };
        rows.push(created);
        return { data: created, error: null };
      }
      return finishMaybeSingle();
    });
    api.maybeSingle = vi.fn(finishMaybeSingle);
    api.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      if (mode === "select") {
        resolve({ data: matched(), error: null });
        return undefined;
      }
      // Mutation wave: track overlap so tests can prove batching.
      inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
      const captured = { filters: [...filters], payload: { ...payload } };
      setTimeout(() => {
        try {
          if (mode === "update") {
            const hit = rows.filter((r) => captured.filters.every((f) => f(r)));
            for (const r of hit) Object.assign(r, captured.payload);
            for (const r of hit) stats.updateCalls.push({ id: r.id, patch: captured.payload });
          } else if (mode === "delete") {
            for (const r of rows.filter((x) => captured.filters.every((f) => f(x)))) {
              rows.splice(rows.indexOf(r), 1);
            }
          }
          inFlight -= 1;
          resolve({
            data: null,
            error: failUpdate ? { message: "write failed" } : null,
          });
        } catch (e) {
          inFlight -= 1;
          if (reject) reject(e);
        }
      }, 0);
      return undefined;
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
    from: vi.fn((name: "profiles" | "profile_links") => table(name)),
  } as unknown as LinksDb;
}

function setup() {
  const store: Store = {
    profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID }],
    links: [linkRow(LINK_A, 0), linkRow(LINK_B, 1), linkRow(LINK_C, 2)],
  };
  const stats: Stats = { maxInFlight: 0, updateCalls: [] };
  return { store, stats, db: fakeLinksDb(store, stats) };
}

describe("getOwnedLink join semantics (via toggle)", () => {
  it("toggles a link owned by the profile+client", async () => {
    const { store, db } = setup();
    const result = await toggleProfileLink(LINK_A, PROFILE_ID, CLIENT_ID, false, db);
    expect(result.ok).toBe(true);
    expect(store.links.find((l) => l.id === LINK_A)?.enabled).toBe(false);
  });

  it("returns NOT_FOUND for a link from another profile", async () => {
    const { db } = setup();
    const result = await toggleProfileLink(LINK_A, OTHER_PROFILE, CLIENT_ID, false, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("returns NOT_FOUND for a link from another client", async () => {
    const { db } = setup();
    const result = await toggleProfileLink(LINK_A, PROFILE_ID, OTHER_CLIENT, false, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("returns NOT_FOUND for malformed ids without querying", async () => {
    const { db } = setup();
    const from = db.from as ReturnType<typeof vi.fn>;
    const result = await toggleProfileLink("nope", PROFILE_ID, CLIENT_ID, false, db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("createProfileLink sort order", () => {
  it("appends max sort_order + 1", async () => {
    const { store, db } = setup();
    const result = await createProfileLink(PROFILE_ID, CLIENT_ID, validInput(), db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sort_order).toBe(3);
    expect(store.links).toHaveLength(4);
  });

  it("starts at 0 when the profile has no links", async () => {
    const store: Store = {
      profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID }],
      links: [],
    };
    const stats: Stats = { maxInFlight: 0, updateCalls: [] };
    const empty = fakeLinksDb(store, stats);
    const result = await createProfileLink(PROFILE_ID, CLIENT_ID, validInput(), empty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sort_order).toBe(0);
  });

  it("rejects unsafe URLs without touching the DB", async () => {
    const { db } = setup();
    const result = await createProfileLink(
      PROFILE_ID,
      CLIENT_ID,
      { ...validInput(), url: "javascript:alert(1)" },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(db.from as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});

describe("reorderProfileLinks batching", () => {
  it("persists the full order in one parallel batch", async () => {
    const { store, stats, db } = setup();
    const result = await reorderProfileLinks(PROFILE_ID, CLIENT_ID, [LINK_C, LINK_B, LINK_A], db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((l) => l.id)).toEqual([LINK_C, LINK_B, LINK_A]);
    const orderOf = (id: string) => store.links.find((l) => l.id === id)?.sort_order;
    expect([orderOf(LINK_C), orderOf(LINK_B), orderOf(LINK_A)]).toEqual([0, 1, 2]);
    // Parallel wave, not N serial round-trips.
    expect(stats.updateCalls).toHaveLength(3);
    expect(stats.maxInFlight).toBe(3);
  });

  it("rejects partial sets without writing (exact-set validation)", async () => {
    const { store, stats, db } = setup();
    const before = store.links.map((l) => l.sort_order);
    const result = await reorderProfileLinks(PROFILE_ID, CLIENT_ID, [LINK_A, LINK_B], db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(stats.updateCalls).toHaveLength(0);
    expect(store.links.map((l) => l.sort_order)).toEqual(before);
  });

  it("rejects foreign ids without writing", async () => {
    const { stats, db } = setup();
    const result = await reorderProfileLinks(
      PROFILE_ID,
      CLIENT_ID,
      [LINK_A, LINK_B, OTHER_PROFILE],
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(stats.updateCalls).toHaveLength(0);
  });

  it("surfaces write failures", async () => {
    const store: Store = {
      profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID }],
      links: [linkRow(LINK_A, 0), linkRow(LINK_B, 1)],
    };
    const stats: Stats = { maxInFlight: 0, updateCalls: [] };
    const db = fakeLinksDb(store, stats, { failUpdate: true });
    const result = await reorderProfileLinks(PROFILE_ID, CLIENT_ID, [LINK_B, LINK_A], db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNKNOWN");
  });
});
