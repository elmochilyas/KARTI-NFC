import { describe, expect, it, vi } from "vitest";
import {
  addProfileSection,
  deleteProfileSection,
  ensureDefaultSections,
  listProfileSections,
  reorderProfileSections,
  seedDefaultSections,
  toggleProfileSection,
  updateSectionSettings,
  type SectionsDb,
} from "./sections";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_CLIENT = "123e4567-e89b-12d3-a456-426614174002";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";
const HERO_ID = "123e4567-e89b-12d3-a456-426614174011";
const ACTIONS_ID = "123e4567-e89b-12d3-a456-426614174012";
const LINKS_ID = "123e4567-e89b-12d3-a456-426614174013";

type Row = Record<string, unknown>;
type Store = { profiles: Row[]; sections: Row[] };

let idCounter = 100;

function sectionRow(id: string, type: string, position: number, enabled = true): Row {
  return {
    id,
    profile_id: PROFILE_ID,
    type,
    position,
    enabled,
    settings: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function fullStore(): Store {
  return {
    profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID, profile_type: "PERSON" }],
    sections: [
      sectionRow(HERO_ID, "hero", 1),
      sectionRow(ACTIONS_ID, "actions", 2),
      sectionRow(LINKS_ID, "links", 3),
    ],
  };
}

/** In-memory PostgREST stand-in (select/insert/update + join for ownership). */
function fakeSectionsDb(
  store: Store,
  options: { authed?: boolean; failUpdate?: boolean } = {},
): SectionsDb {
  const { authed = true, failUpdate = false } = options;

  function matchedRows(table: "profiles" | "profile_sections", filters: ((r: Row) => boolean)[]) {
    const rows = table === "profiles" ? store.profiles : store.sections;
    return rows.filter((r) => filters.every((f) => f(r)));
  }

  function table(tableName: "profiles" | "profile_sections") {
    const filters: ((r: Row) => boolean)[] = [];
    const orders: { key: string; asc: boolean }[] = [];
    let selected = "";
    let mode: "select" | "update" | "insert" | "delete" = "select";
    let payload: Row = {};
    let pendingRows: Row[] = [];

    const applyOrder = (rows: Row[]) =>
      orders.length === 0
        ? rows
        : [...rows].sort((a, b) => {
            for (const { key, asc } of orders) {
              const cmp =
                (a[key] as number) < (b[key] as number)
                  ? -1
                  : (a[key] as number) > (b[key] as number)
                    ? 1
                    : 0;
              if (cmp !== 0) return asc ? cmp : -cmp;
            }
            return 0;
          });

    /** UNIQUE(profile_id, type) + UNIQUE(profile_id, position) stand-in. */
    function performInsert(): { data: Row[] | null; error: { code: string } | null } {
      for (const row of pendingRows) {
        const clash = store.sections.some(
          (s) =>
            s.profile_id === row.profile_id &&
            (s.type === row.type || s.position === row.position),
        );
        if (clash) return { data: null, error: { code: "23505" } };
      }
      const inserted: Row[] = [];
      for (const row of pendingRows) {
        idCounter += 1;
        const full = {
          id: `123e4567-e89b-12d3-a456-42661417${String(idCounter).padStart(4, "0")}`,
          settings: {},
          enabled: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          ...row,
        };
        store.sections.push(full);
        inserted.push(full);
      }
      return { data: inserted, error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: (cols: string) => {
        selected = cols;
        return b;
      },
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return b;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orders.push({ key: col, asc: opts?.ascending !== false });
        return b;
      },
      update: (patch: Row) => {
        mode = "update";
        payload = patch;
        return b;
      },
      insert: (rows: Row | Row[]) => {
        mode = "insert";
        pendingRows = Array.isArray(rows) ? rows : [rows];
        return b;
      },
      delete: () => {
        mode = "delete";
        return b;
      },
      maybeSingle: async () => {
        if (failUpdate && mode === "update") return { data: null, error: { code: "500" } };
        if (mode === "insert") {
          const outcome = performInsert();
          if (outcome.error) return { data: null, error: outcome.error };
          return { data: outcome.data?.[0] ?? null, error: null };
        }
        if (mode === "delete") {
          const hit = matchedRows(tableName, filters);
          for (const r of hit) {
            const idx = store.sections.indexOf(r);
            if (idx >= 0) store.sections.splice(idx, 1);
          }
          return { data: hit[0] ?? null, error: null };
        }
        const hit = applyOrder(matchedRows(tableName, filters));
        if (mode === "update") {
          for (const r of hit) Object.assign(r, payload);
          const first = hit[0] ?? null;
          return { data: first, error: null };
        }
        const first = hit[0] ?? null;
        if (!first) return { data: null, error: null };
        if (tableName === "profile_sections" && selected.includes("profiles")) {
          const owner = store.profiles.find((p) => p.id === (first as Row).profile_id);
          return { data: { ...first, profiles: owner ? { client_id: owner.client_id } : null }, error: null };
        }
        return { data: first, error: null };
      },
      // Thenable so bare `await builder` (list reads, bare updates) resolves.
      then: (resolve: (v: unknown) => void) => {
        if (failUpdate && mode === "update") {
          resolve({ data: null, error: { code: "500" } });
          return;
        }
        if (mode === "insert") {
          const outcome = performInsert();
          resolve({ data: outcome.data, error: outcome.error });
          return;
        }
        if (mode === "delete") {
          const hit = matchedRows(tableName, filters);
          for (const r of hit) {
            const idx = store.sections.indexOf(r);
            if (idx >= 0) store.sections.splice(idx, 1);
          }
          resolve({ data: hit, error: null });
          return;
        }
        const hit = applyOrder(matchedRows(tableName, filters));
        if (mode === "update") for (const r of hit) Object.assign(r, payload);
        resolve({ data: hit, error: null });
      },
    };
    return b;
  }

  return {
    auth: { getClaims: vi.fn(async () => (authed ? { data: { claims: { sub: "admin" } } } : { data: null })) },
    from: vi.fn((name: string) => table(name as "profiles" | "profile_sections")),
  } as unknown as SectionsDb;
}

describe("listProfileSections", () => {
  it("returns sections in position order", async () => {
    const store = fullStore();
    // Shuffle storage order; service must sort by position.
    store.sections.reverse();
    const result = await listProfileSections(PROFILE_ID, CLIENT_ID, fakeSectionsDb(store));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.map((s) => s.type)).toEqual(["hero", "actions", "links"]);
  });

  it("requires admin", async () => {
    const result = await listProfileSections(PROFILE_ID, CLIENT_ID, fakeSectionsDb(fullStore(), { authed: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects cross-client access and bad ids", async () => {
    const store = fullStore();
    const db = fakeSectionsDb(store);
    const cross = await listProfileSections(PROFILE_ID, OTHER_CLIENT, db);
    expect(cross.ok).toBe(false);
    const bad = await listProfileSections("not-a-uuid", CLIENT_ID, db);
    expect(bad.ok).toBe(false);
  });
});

describe("toggleProfileSection", () => {
  it("flips enabled without touching siblings", async () => {
    const store = fullStore();
    const db = fakeSectionsDb(store);
    const result = await toggleProfileSection(LINKS_ID, PROFILE_ID, CLIENT_ID, false, db);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.enabled).toBe(false);
    expect(store.sections.find((s) => s.id === HERO_ID)?.enabled).toBe(true);
  });

  it("rejects cross-client toggles", async () => {
    const result = await toggleProfileSection(
      LINKS_ID,
      PROFILE_ID,
      OTHER_CLIENT,
      false,
      fakeSectionsDb(fullStore()),
    );
    expect(result.ok).toBe(false);
  });
});

describe("reorderProfileSections", () => {
  it("persists a new order with 1-based positions", async () => {
    const store = fullStore();
    const db = fakeSectionsDb(store);
    const result = await reorderProfileSections(
      PROFILE_ID,
      CLIENT_ID,
      [LINKS_ID, HERO_ID, ACTIONS_ID],
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((s) => s.type)).toEqual(["links", "hero", "actions"]);
      expect(result.data.map((s) => s.position)).toEqual([1, 2, 3]);
    }
  });

  it("rejects partial, extra, and malformed id sets", async () => {
    const db = () => fakeSectionsDb(fullStore());
    const partial = await reorderProfileSections(PROFILE_ID, CLIENT_ID, [LINKS_ID, HERO_ID], db());
    expect(partial.ok).toBe(false);
    const extra = await reorderProfileSections(
      PROFILE_ID,
      CLIENT_ID,
      [LINKS_ID, HERO_ID, ACTIONS_ID, HERO_ID],
      db(),
    );
    expect(extra.ok).toBe(false);
    const malformed = await reorderProfileSections(PROFILE_ID, CLIENT_ID, ["nope", HERO_ID, ACTIONS_ID], db());
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.error.code).toBe("VALIDATION_ERROR");
  });

  it("surfaces write failures cleanly", async () => {
    const result = await reorderProfileSections(
      PROFILE_ID,
      CLIENT_ID,
      [LINKS_ID, HERO_ID, ACTIONS_ID],
      fakeSectionsDb(fullStore(), { failUpdate: true }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("seedDefaultSections", () => {
  it("inserts hero/actions/links at 1/2/3", async () => {
    const store: Store = {
      profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID, profile_type: "PERSON" }],
      sections: [],
    };
    const ok = await seedDefaultSections(PROFILE_ID, fakeSectionsDb(store));
    expect(ok).toBe(true);
    expect(store.sections.map((s) => [s.type, s.position])).toEqual([
      ["hero", 1],
      ["actions", 2],
      ["links", 3],
    ]);
    expect(store.sections.every((s) => s.enabled === true)).toBe(true);
  });

  it("returns false when rows already exist (unique guard)", async () => {
    const ok = await seedDefaultSections(PROFILE_ID, fakeSectionsDb(fullStore()));
    expect(ok).toBe(false);
  });
});

describe("ensureDefaultSections", () => {
  it("is a no-op returning sorted rows when complete", async () => {
    const store = fullStore();
    store.sections.reverse();
    const result = await ensureDefaultSections(PROFILE_ID, CLIENT_ID, fakeSectionsDb(store));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((s) => s.type)).toEqual(["hero", "actions", "links"]);
      expect(store.sections).toHaveLength(3);
    }
  });

  it("repairs a partial set by appending missing types", async () => {
    const store: Store = {
      profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID, profile_type: "PERSON" }],
      sections: [sectionRow(HERO_ID, "hero", 1)],
    };
    const result = await ensureDefaultSections(PROFILE_ID, CLIENT_ID, fakeSectionsDb(store));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.map((s) => s.type)).toEqual(["hero", "actions", "links"]);
    expect(store.sections).toHaveLength(3);
  });

  it("rejects unknown stored types via the ownership gate", async () => {
    const store = fullStore();
    const unknownId = "123e4567-e89b-12d3-a456-426614174099";
    store.sections.push(sectionRow(unknownId, "teleport", 4));
    const result = await toggleProfileSection(unknownId, PROFILE_ID, CLIENT_ID, false, fakeSectionsDb(store));
    expect(result.ok).toBe(false);
  });

  it("operates on registry-known planned types", async () => {
    const store = fullStore();
    const plannedId = "123e4567-e89b-12d3-a456-426614174098";
    store.sections.push(sectionRow(plannedId, "location", 4));
    const db = fakeSectionsDb(store);
    const result = await toggleProfileSection(plannedId, PROFILE_ID, CLIENT_ID, false, db);
    expect(result.ok).toBe(true);
  });
});

describe("addProfileSection", () => {
  it("appends a registry type after the max position, enabled", async () => {
    const store = fullStore();
    const result = await addProfileSection(
      PROFILE_ID,
      CLIENT_ID,
      "about",
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("about");
      expect(result.data.position).toBe(4);
      expect(result.data.enabled).toBe(true);
    }
    expect(store.sections).toHaveLength(4);
  });

  it("rejects duplicates with CONFLICT", async () => {
    const result = await addProfileSection(
      PROFILE_ID,
      CLIENT_ID,
      "hero",
      fakeSectionsDb(fullStore()),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFLICT");
  });

  it("rejects unknown types without querying", async () => {
    const from = vi.fn();
    const db = { ...(fakeSectionsDb(fullStore()) as object), from } as unknown as SectionsDb;
    const result = await addProfileSection(PROFILE_ID, CLIENT_ID, "teleport", db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects cross-client and unauthenticated adds", async () => {
    const cross = await addProfileSection(
      PROFILE_ID,
      OTHER_CLIENT,
      "location",
      fakeSectionsDb(fullStore()),
    );
    expect(cross.ok).toBe(false);
    const anon = await addProfileSection(
      PROFILE_ID,
      CLIENT_ID,
      "location",
      fakeSectionsDb(fullStore(), { authed: false }),
    );
    expect(anon.ok).toBe(false);
    if (!anon.ok) expect(anon.error.code).toBe("UNAUTHORIZED");
  });
});

describe("deleteProfileSection", () => {
  const PLANNED_ID = "123e4567-e89b-12d3-a456-426614174097";

  function storeWithPlanned(): Store {
    const store = fullStore();
    store.sections.push(sectionRow(PLANNED_ID, "location", 4));
    return store;
  }

  it("removes a planned-type row", async () => {
    const store = storeWithPlanned();
    const result = await deleteProfileSection(
      PLANNED_ID,
      PROFILE_ID,
      CLIENT_ID,
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(true);
    expect(store.sections.map((s) => s.type)).toEqual(["hero", "actions", "links"]);
  });

  it("protects the foundation trio", async () => {
    for (const id of [HERO_ID, ACTIONS_ID, LINKS_ID]) {
      const result = await deleteProfileSection(
        id,
        PROFILE_ID,
        CLIENT_ID,
        fakeSectionsDb(fullStore()),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects cross-client deletes", async () => {
    const result = await deleteProfileSection(
      PLANNED_ID,
      PROFILE_ID,
      OTHER_CLIENT,
      fakeSectionsDb(storeWithPlanned()),
    );
    expect(result.ok).toBe(false);
  });
});
describe("reorderProfileSections with mixed types", () => {
  it("orders foundation + registry rows by position", async () => {
    const store = fullStore();
    const plannedId = "123e4567-e89b-12d3-a456-426614174096";
    store.sections.push(sectionRow(plannedId, "location", 4));
    const db = fakeSectionsDb(store);
    const result = await reorderProfileSections(
      PROFILE_ID,
      CLIENT_ID,
      [plannedId, HERO_ID, ACTIONS_ID, LINKS_ID],
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((s) => s.type)).toEqual(["location", "hero", "actions", "links"]);
      expect(result.data.map((s) => s.position)).toEqual([1, 2, 3, 4]);
    }
  });
});

describe("updateSectionSettings", () => {
  it("persists sanitized settings for a live type", async () => {
    const store = fullStore();
    const db = fakeSectionsDb(store);
    const result = await updateSectionSettings(
      LINKS_ID,
      PROFILE_ID,
      CLIENT_ID,
      { showSubtitles: false, injected: true },
      db,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.settings).toEqual({ showSubtitles: false });
    expect(store.sections.find((s) => s.id === LINKS_ID)?.settings).toEqual({
      showSubtitles: false,
    });
  });

  it("rejects invalid values without writing", async () => {
    const store = fullStore();
    const result = await updateSectionSettings(
      LINKS_ID,
      PROFILE_ID,
      CLIENT_ID,
      { showSubtitles: "yes" },
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(store.sections.find((s) => s.id === LINKS_ID)?.settings).toEqual({});
  });

  it("rejects unknown stored types at the ownership gate", async () => {
    const store = fullStore();
    const unknownId = "123e4567-e89b-12d3-a456-426614174095";
    store.sections.push(sectionRow(unknownId, "teleport", 4));
    const result = await updateSectionSettings(
      unknownId,
      PROFILE_ID,
      CLIENT_ID,
      { columns: 3 },
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("rejects cross-client writes", async () => {
    const result = await updateSectionSettings(
      LINKS_ID,
      PROFILE_ID,
      OTHER_CLIENT,
      { showSubtitles: false },
      fakeSectionsDb(fullStore()),
    );
    expect(result.ok).toBe(false);
  });

  it("persists gallery settings for PERSON profiles", async () => {
    const store = fullStore();
    const galleryId = "123e4567-e89b-12d3-a456-426614174093";
    store.sections.push(sectionRow(galleryId, "gallery", 4));
    const result = await updateSectionSettings(
      galleryId,
      PROFILE_ID,
      CLIENT_ID,
      { title: "Photos", layout: "masonry", images: [] },
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(true);
  });

  it("adds gallery sections for both profile audiences", async () => {
    const person = await addProfileSection(PROFILE_ID, CLIENT_ID, "gallery", fakeSectionsDb(fullStore()));
    expect(person.ok).toBe(true);
  });

  it("persists location settings with coordinate coercion", async () => {
    const store = fullStore();
    const locationId = "123e4567-e89b-12d3-a456-426614174094";
    store.sections.push(sectionRow(locationId, "location", 4));
    const result = await updateSectionSettings(
      locationId,
      PROFILE_ID,
      CLIENT_ID,
      { address: "123 Main St", latitude: "33.99", longitude: "-6.84" },
      fakeSectionsDb(store),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.settings).toMatchObject({
        address: "123 Main St",
        latitude: 33.99,
        longitude: -6.84,
      });
    }
  });
});

describe("addProfileSection audience gating", () => {
  it("rejects BUSINESS-only types on PERSON profiles", async () => {
    const result = await addProfileSection(
      PROFILE_ID,
      CLIENT_ID,
      "menu",
      fakeSectionsDb(fullStore()),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts audience-compatible types", async () => {
    const businessStore: Store = {
      profiles: [{ id: PROFILE_ID, client_id: CLIENT_ID, profile_type: "BUSINESS" }],
      sections: [
        sectionRow(HERO_ID, "hero", 1),
        sectionRow(ACTIONS_ID, "actions", 2),
        sectionRow(LINKS_ID, "links", 3),
      ],
    };
    const result = await addProfileSection(
      PROFILE_ID,
      CLIENT_ID,
      "menu",
      fakeSectionsDb(businessStore),
    );
    expect(result.ok).toBe(true);
  });
});
