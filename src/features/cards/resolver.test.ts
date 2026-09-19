import { describe, expect, it, vi } from "vitest";
import { resolveCardDestination } from "./resolver";
import type { ResolverDb } from "./resolver";

type Row = Record<string, unknown>;

const ACTIVE_PROFILE_CARD: Row = {
  id: "card-1",
  short_code: "ABCDEFGH",
  status: "ACTIVE",
  destination_type: "PROFILE",
  destination_profile_id: "profile-1",
  destination_url: null,
};

/** Fake: canned card row + profile row, honoring .eq() filters. */
function fakeDb(card: Row | null, profile: Row | null): ResolverDb {
  function table(rows: (Row | null)[]) {
    const filters: ((r: Row) => boolean)[] = [];
    const api: Record<string, unknown> = {};
    api.select = vi.fn(() => api);
    api.eq = vi.fn((col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return api;
    });
    api.maybeSingle = vi.fn(async () => {
      const matched = rows.filter((r): r is Row => r !== null && filters.every((f) => f(r)));
      return { data: matched[0] ?? null, error: null };
    });
    return api;
  }
  return {
    from: vi.fn((name: string) => table(name === "cards" ? [card] : [profile])),
  } as unknown as ResolverDb;
}

describe("resolveCardDestination", () => {
  const ACTIVE_PROFILE: Row = { id: "profile-1", slug: "ahmed-benali", status: "ACTIVE" };

  it("rejects non-string and malformed codes without querying", async () => {
    const from = vi.fn();
    const db = { from } as unknown as ResolverDb;
    for (const code of [null, 42, "", "!!!", "card-12", "toolongcode123"]) {
      expect(await resolveCardDestination(code, db)).toEqual({ ok: false, reason: "NOT_FOUND" });
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("normalizes case", async () => {
    const db = fakeDb(ACTIVE_PROFILE_CARD, ACTIVE_PROFILE);
    const result = await resolveCardDestination("abcdefgh", db);
    expect(result).toEqual({ ok: true, kind: "PROFILE", target: "/ahmed-benali" });
  });

  it("returns NOT_FOUND for unknown cards", async () => {
    expect(await resolveCardDestination("ZZZZZZZZ", fakeDb(null, null))).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it.each(["UNASSIGNED", "ASSIGNED", "DISABLED", "LOST", "REPLACED"])(
    "returns NOT_ACTIVE for %s cards",
    async (status) => {
      const result = await resolveCardDestination(
        "ABCDEFGH",
        fakeDb({ ...ACTIVE_PROFILE_CARD, status }, ACTIVE_PROFILE),
      );
      expect(result).toEqual({ ok: false, reason: "NOT_ACTIVE" });
    },
  );

  it("resolves ACTIVE profile destinations to the current slug", async () => {
    const result = await resolveCardDestination(
      "ABCDEFGH",
      fakeDb(ACTIVE_PROFILE_CARD, { ...ACTIVE_PROFILE, slug: "ahmed-b" }),
    );
    expect(result).toEqual({ ok: true, kind: "PROFILE", target: "/ahmed-b" });
  });

  it("returns PROFILE_UNAVAILABLE for missing or inactive profiles", async () => {
    expect(await resolveCardDestination("ABCDEFGH", fakeDb(ACTIVE_PROFILE_CARD, null))).toEqual({
      ok: false,
      reason: "PROFILE_UNAVAILABLE",
    });
    expect(
      await resolveCardDestination(
        "ABCDEFGH",
        fakeDb(ACTIVE_PROFILE_CARD, { ...ACTIVE_PROFILE, status: "DRAFT" }),
      ),
    ).toEqual({ ok: false, reason: "PROFILE_UNAVAILABLE" });
    expect(
      await resolveCardDestination(
        "ABCDEFGH",
        fakeDb(ACTIVE_PROFILE_CARD, { ...ACTIVE_PROFILE, status: "INACTIVE" }),
      ),
    ).toEqual({ ok: false, reason: "PROFILE_UNAVAILABLE" });
  });

  it("resolves valid external URLs", async () => {
    const result = await resolveCardDestination(
      "ABCDEFGH",
      fakeDb(
        {
          ...ACTIVE_PROFILE_CARD,
          destination_type: "EXTERNAL_URL",
          destination_profile_id: null,
          destination_url: "https://instagram.com/ahmed",
        },
        null,
      ),
    );
    expect(result).toEqual({
      ok: true,
      kind: "EXTERNAL_URL",
      target: "https://instagram.com/ahmed",
    });
  });

  it("blocks unsafe stored URLs", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///x", "vbscript:x", ""]) {
      const result = await resolveCardDestination(
        "ABCDEFGH",
        fakeDb(
          {
            ...ACTIVE_PROFILE_CARD,
            destination_type: "EXTERNAL_URL",
            destination_profile_id: null,
            destination_url: url,
          },
          null,
        ),
      );
      expect(result).toEqual({ ok: false, reason: "INVALID_DESTINATION" });
    }
  });

  it("rejects missing destinations and invalid combinations", async () => {
    expect(
      await resolveCardDestination(
        "ABCDEFGH",
        fakeDb({ ...ACTIVE_PROFILE_CARD, destination_type: null }, null),
      ),
    ).toEqual({ ok: false, reason: "INVALID_DESTINATION" });
    expect(
      await resolveCardDestination(
        "ABCDEFGH",
        fakeDb({ ...ACTIVE_PROFILE_CARD, destination_profile_id: null }, null),
      ),
    ).toEqual({ ok: false, reason: "INVALID_DESTINATION" });
  });
});
