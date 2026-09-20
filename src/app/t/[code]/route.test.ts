import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResolverDb } from "@/features/cards/resolver";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { GET } from "./route";

type Row = Record<string, unknown>;

const ACTIVE_PROFILE_CARD: Row = {
  id: "card-1",
  short_code: "ABCDEFGH",
  status: "ACTIVE",
  destination_type: "PROFILE",
  destination_profile_id: "profile-1",
  destination_url: null,
};

const ACTIVE_PROFILE: Row = { id: "profile-1", slug: "ahmed-benali", status: "ACTIVE" };

/** Fake honoring .eq() filters, in the style of resolver.test.ts. */
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

const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("GET /t/[code]", () => {
  it("307-redirects an active profile card to the canonical profile URL", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_PROFILE_CARD, ACTIVE_PROFILE));
    const res = await GET(new Request("http://evil.example/t/ABCDEFGH"), ctx("ABCDEFGH"));
    expect(res.status).toBe(307);
    // Canonical APP_URL base — never the incoming Host header.
    expect(res.headers.get("location")).toBe("http://localhost:3000/ahmed-benali");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("307-redirects an active external card to the validated URL", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      fakeDb(
        {
          ...ACTIVE_PROFILE_CARD,
          destination_type: "EXTERNAL_URL",
          destination_url: "https://example.com/menu",
        },
        null,
      ),
    );
    const res = await GET(new Request("http://localhost:3000/t/ABCDEFGH"), ctx("abcdefgh"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/menu");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("renders unavailable for unknown, inactive, and unsafe cards alike", async () => {
    const cases: [Row | null, Row | null][] = [
      [null, null],
      [{ ...ACTIVE_PROFILE_CARD, status: "DISABLED" }, ACTIVE_PROFILE],
      [{ ...ACTIVE_PROFILE_CARD, status: "LOST" }, ACTIVE_PROFILE],
      [{ ...ACTIVE_PROFILE_CARD, status: "ASSIGNED" }, ACTIVE_PROFILE],
      [ACTIVE_PROFILE_CARD, { ...ACTIVE_PROFILE, status: "INACTIVE" }],
      [
        {
          ...ACTIVE_PROFILE_CARD,
          destination_type: "EXTERNAL_URL",
          destination_url: "javascript:alert(1)",
        },
        null,
      ],
    ];
    for (const [card, profile] of cases) {
      vi.mocked(createAdminClient).mockReturnValue(fakeDb(card, profile));
      await expect(
        GET(new Request("http://localhost:3000/t/ABCDEFGH"), ctx("ABCDEFGH")),
      ).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  it("rejects card numbers and malformed codes without querying", async () => {
    const from = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ResolverDb);
    for (const code of ["KARTI-000123", "!!!", ""]) {
      await expect(GET(new Request("http://localhost:3000/t/x"), ctx(code))).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("renders unavailable when server reads are misconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing env");
    });
    await expect(
      GET(new Request("http://localhost:3000/t/ABCDEFGH"), ctx("ABCDEFGH")),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
