import { describe, expect, it, vi } from "vitest";
import {
  PROFILE_TEMPLATES,
  compatibleTemplates,
  defaultTemplateFor,
  getProfileTemplate,
  isProfileTemplateId,
  seedTemplateSections,
} from "./profileTemplates";
import type { SectionsDb } from "./sections";

type Row = Record<string, unknown>;

/** Minimal profile_sections stand-in (select list + insert, thenable). */
function fakeSeedDb(
  store: Row[],
  options: { failInsert?: boolean } = {},
): { db: SectionsDb; inserted: Row[][] } {
  const inserted: Row[][] = [];
  let mode: "select" | "insert" = "select";
  let pending: Row[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    select: () => b,
    eq: () => b,
    insert: (rows: Row | Row[]) => {
      mode = "insert";
      pending = Array.isArray(rows) ? rows : [rows];
      return b;
    },
    then: (resolve: (v: unknown) => void) => {
      if (mode === "insert") {
        mode = "select";
        if (options.failInsert) {
          resolve({ data: null, error: { code: "500" } });
          return;
        }
        inserted.push(pending);
        for (const row of pending) store.push({ ...row });
        resolve({ data: pending, error: null });
        return;
      }
      resolve({ data: [...store], error: null });
    },
  };
  return {
    db: { from: vi.fn(() => b) } as unknown as SectionsDb,
    inserted,
  };
}

const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";

function row(type: string, position: number, extra: Row = {}): Row {
  return {
    id: `sec-${type}`,
    profile_id: PROFILE_ID,
    type,
    position,
    enabled: true,
    settings: {},
    ...extra,
  };
}

describe("profile template registry", () => {
  it("defines personal, business, restaurant and store templates", () => {
    expect(PROFILE_TEMPLATES.map((t) => t.id).sort()).toEqual([
      "business",
      "personal",
      "restaurant",
      "store",
    ]);
    for (const t of PROFILE_TEMPLATES) {
      expect(t.label.trim()).not.toBe("");
      expect(t.description.trim()).not.toBe("");
      expect(t.sections.length).toBeGreaterThan(0);
    }
  });

  it("gives the restaurant the full spec section set", () => {
    expect(getProfileTemplate("restaurant")?.sections.map((s) => s.type)).toEqual([
      "hero",
      "actions",
      "links",
      "location",
      "opening_hours",
      "menu",
      "gallery",
    ]);
  });

  it("keeps every template section within its profile-type audience", () => {
    const audiences: Record<string, string[]> = {
      hero: ["PERSON", "BUSINESS"],
      actions: ["PERSON", "BUSINESS"],
      links: ["PERSON", "BUSINESS"],
      location: ["BUSINESS"],
      opening_hours: ["BUSINESS"],
      menu: ["RESTAURANT", "BUSINESS"],
      catalog: ["BUSINESS"],
      gallery: ["PERSON", "BUSINESS"],
    };
    for (const t of PROFILE_TEMPLATES) {
      for (const s of t.sections) {
        expect(audiences[s.type]).toContain(t.profileType);
      }
    }
  });

  it("resolves defaults and compatibility by profile type", () => {
    expect(defaultTemplateFor("PERSON")).toBe("personal");
    expect(defaultTemplateFor("BUSINESS")).toBe("business");
    expect(defaultTemplateFor("???")).toBe("personal");
    expect(compatibleTemplates("PERSON").map((t) => t.id)).toEqual(["personal"]);
    expect(
      compatibleTemplates("BUSINESS")
        .map((t) => t.id)
        .sort(),
    ).toEqual(["business", "restaurant", "store"]);
    expect(isProfileTemplateId("restaurant")).toBe(true);
    expect(isProfileTemplateId("nope")).toBe(false);
    expect(getProfileTemplate("nope")).toBeNull();
  });
});

describe("seedTemplateSections", () => {
  it("seeds the full restaurant set with 1-based positions", async () => {
    const store: Row[] = [];
    const { db, inserted } = fakeSeedDb(store);
    expect(await seedTemplateSections(PROFILE_ID, "restaurant", db)).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(store.map((r) => [r.type, r.position, r.enabled])).toEqual([
      ["hero", 1, true],
      ["actions", 2, true],
      ["links", 3, true],
      ["location", 4, true],
      ["opening_hours", 5, true],
      ["menu", 6, true],
      ["gallery", 7, true],
    ]);
  });

  it("is idempotent: rerunning inserts nothing (duplicate prevention)", async () => {
    const store: Row[] = [];
    const { db, inserted } = fakeSeedDb(store);
    expect(await seedTemplateSections(PROFILE_ID, "business", db)).toBe(true);
    expect(await seedTemplateSections(PROFILE_ID, "business", db)).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(store).toHaveLength(5);
  });

  it("never touches existing rows (disabled, customized, or foreign)", async () => {
    const store: Row[] = [
      row("hero", 1),
      row("actions", 2, { enabled: false }),
      row("links", 3, { settings: { showSubtitles: false } }),
      row("teleport", 9, { enabled: false }),
    ];
    const before = structuredClone(store);
    const { db } = fakeSeedDb(store);
    expect(await seedTemplateSections(PROFILE_ID, "business", db)).toBe(true);
    // Pre-existing rows byte-identical; only location + opening_hours appended.
    for (const original of before) {
      expect(store).toContainEqual(original);
    }
    expect(store.map((r) => r.type).sort()).toEqual([
      "actions",
      "hero",
      "links",
      "location",
      "opening_hours",
      "teleport",
    ]);
  });

  it("fails closed on bad ids and write errors", async () => {
    const { db } = fakeSeedDb([]);
    expect(await seedTemplateSections(PROFILE_ID, "nope", db)).toBe(false);
    expect(await seedTemplateSections("not-a-uuid", "business", db)).toBe(false);
    const failing = fakeSeedDb([], { failInsert: true });
    expect(await seedTemplateSections(PROFILE_ID, "business", failing.db)).toBe(false);
  });
});
