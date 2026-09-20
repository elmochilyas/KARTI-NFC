import { describe, expect, it, vi } from "vitest";
import {
  getPublicProfileBySlug,
  getPublicProfileRowBySlug,
  hasContactData,
  PUBLIC_LINK_COLUMNS,
  PUBLIC_PROFILE_COLUMNS,
  publicProfileDescription,
  publicProfileTitle,
} from "./public";
import type { PublicDb } from "./public";

const ACTIVE_ROW = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: "Developer",
  company_name: "Atlas",
  bio: "Bio here.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: "ahmed@example.com",
  website: null,
  address: null,
  maps_url: null,
  accent_color: null,
  theme: "light",
  status: "ACTIVE",
};

/** Fake query builder: canned profile row + link rows; honors .eq() filters. */
function fakeDb(profile: Record<string, unknown> | null, links: unknown[] = []): PublicDb {
  const filters: [string, unknown][] = [];
  const profileQuery: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return profileQuery;
    }),
    maybeSingle: vi.fn(async () => {
      const matches =
        profile !== null &&
        filters.every(([column, value]) => (profile as Record<string, unknown>)[column] === value);
      return { data: matches ? profile : null, error: null };
    }),
  };
  const orderCalls: unknown[][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn((...args: unknown[]) => {
    orderCalls.push(args);
    return chain;
  });
  chain.then = (resolve: (v: unknown) => void) => {
    resolve({ data: links, error: null });
  };
  chain.orderCalls = orderCalls;
  return {
    from: vi.fn((table: string) => (table === "profiles" ? profileQuery : chain)),
    __linksChain: chain,
  } as unknown as PublicDb;
}

describe("getPublicProfileBySlug", () => {
  it("returns ACTIVE profiles with links in database order", async () => {
    const db = fakeDb(ACTIVE_ROW, [
      { id: "l1", type: "instagram", label: "IG", url: "https://ig.com", sort_order: 0 },
      { id: "l2", type: "website", label: "Site", url: "https://x.com", sort_order: 1 },
    ]);
    const result = await getPublicProfileBySlug("Ahmed-Benali", db);
    expect(result?.profile.slug).toBe("ahmed-benali");
    expect(result?.links.map((l) => l.id)).toEqual(["l1", "l2"]);
    // Links are requested ordered by sort_order.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (db as any).__linksChain;
    expect(chain.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    // Projection carries no admin/private fields.
    expect(result?.profile).not.toHaveProperty("notes");
    expect(result?.profile).not.toHaveProperty("client_id");
    expect(result?.profile).not.toHaveProperty("created_at");
  });

  it("returns null for DRAFT, INACTIVE, and unknown slugs", async () => {
    for (const row of [
      { ...ACTIVE_ROW, status: "DRAFT" },
      { ...ACTIVE_ROW, status: "INACTIVE" },
      null,
    ]) {
      const result = await getPublicProfileBySlug("ahmed-benali", fakeDb(row));
      expect(result).toBeNull();
    }
  });

  it("returns null for reserved and empty slugs without querying", async () => {
    const from = vi.fn();
    const db = { from } as unknown as PublicDb;
    expect(await getPublicProfileBySlug("login", db)).toBeNull();
    expect(await getPublicProfileBySlug("!!!", db)).toBeNull();
    expect(await getPublicProfileBySlug("dashboard", db)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("normalizes dark vs unexpected theme values", async () => {
    const dark = await getPublicProfileBySlug(
      "ahmed-benali",
      fakeDb({ ...ACTIVE_ROW, theme: "dark" }),
    );
    expect(dark?.profile.theme).toBe("dark");
    const weird = await getPublicProfileBySlug(
      "ahmed-benali",
      fakeDb({ ...ACTIVE_ROW, theme: "neon" }),
    );
    expect(weird?.profile.theme).toBe("light");
  });
});

describe("getPublicProfileRowBySlug (vCard profile-only loader)", () => {
  it("returns the ACTIVE profile row without querying links", async () => {
    const db = fakeDb(ACTIVE_ROW, [
      { id: "l1", type: "instagram", label: "IG", url: "https://ig.com", sort_order: 0 },
    ]);
    const result = await getPublicProfileRowBySlug("Ahmed-Benali", db);
    expect(result?.slug).toBe("ahmed-benali");
    expect(result).not.toHaveProperty("links");
    expect(result).not.toHaveProperty("notes");
    // Only the profiles table is hit — no profile_links RTT for vCards.
    const tables = vi
      .mocked(db.from)
      .mock.calls.map((call) => call[0] as string);
    expect(tables).toEqual(["profiles"]);
  });

  it("returns null for DRAFT, INACTIVE, unknown, reserved, and empty slugs", async () => {
    for (const row of [
      { ...ACTIVE_ROW, status: "DRAFT" },
      { ...ACTIVE_ROW, status: "INACTIVE" },
      null,
    ]) {
      expect(await getPublicProfileRowBySlug("ahmed-benali", fakeDb(row))).toBeNull();
    }
    const from = vi.fn();
    const db = { from } as unknown as PublicDb;
    expect(await getPublicProfileRowBySlug("login", db)).toBeNull();
    expect(await getPublicProfileRowBySlug("!!!", db)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("public projection allowlist", () => {
  it("selects exactly the public-safe columns (notes/ids/timestamps excluded)", () => {
    expect(new Set(PUBLIC_PROFILE_COLUMNS.split(",").map((c) => c.trim()))).toEqual(
      new Set([
        "id",
        "profile_type",
        "slug",
        "display_name",
        "job_title",
        "company_name",
        "bio",
        "avatar_path",
        "cover_path",
        "phone",
        "whatsapp",
        "email",
        "website",
        "address",
        "maps_url",
        "accent_color",
        "theme",
        "status",
      ]),
    );
    expect(new Set(PUBLIC_LINK_COLUMNS.split(",").map((c) => c.trim()))).toEqual(
      new Set(["id", "type", "label", "url", "sort_order"]),
    );
  });
});

describe("hasContactData", () => {
  it("requires a name plus phone or email", () => {
    expect(hasContactData({ display_name: "A", phone: "+1", email: null })).toBe(true);
    expect(hasContactData({ display_name: "A", phone: null, email: "a@x.com" })).toBe(true);
    expect(hasContactData({ display_name: "A", phone: null, email: null })).toBe(false);
    expect(hasContactData({ display_name: "  ", phone: "+1", email: null })).toBe(false);
  });
});

describe("publicProfileTitle + publicProfileDescription", () => {
  it("builds titles with and without company", () => {
    expect(publicProfileTitle({ display_name: "Ahmed", company_name: "Atlas" })).toBe(
      "Ahmed — Atlas | Karti",
    );
    expect(publicProfileTitle({ display_name: "Ahmed", company_name: null })).toBe("Ahmed | Karti");
  });

  it("builds a plain-text description", () => {
    expect(publicProfileDescription({ job_title: "Dev", bio: "Hi", company_name: "Atlas" })).toBe(
      "Dev · Atlas · Hi",
    );
    expect(publicProfileDescription({ job_title: null, bio: null, company_name: null })).toBe(
      "View this Karti contact profile.",
    );
  });
});
