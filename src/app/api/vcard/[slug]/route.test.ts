import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicDb } from "@/features/profiles/public";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "./route";

const ACTIVE_ROW = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: null,
  company_name: "Atlas",
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: "ahmed@example.com",
  website: "javascript:alert(1)",
  address: null,
  maps_url: null,
  accent_color: null,
  theme: "light",
  status: "ACTIVE",
};

/** Fake honoring status/slug .eq() filters; links resolve to []. */
function fakeDb(profile: Record<string, unknown> | null): PublicDb {
  const filters: [string, unknown][] = [];
  const profileQuery: Record<string, unknown> = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return profileQuery;
    }),
    maybeSingle: vi.fn(async () => {
      const matches =
        profile !== null && filters.every(([column, value]) => profile[column] === value);
      return { data: matches ? profile : null, error: null };
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
  chain.order = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  return {
    from: vi.fn((t: string) => (t === "profiles" ? profileQuery : chain)),
  } as unknown as PublicDb;
}

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("GET /api/vcard/[slug]", () => {
  it("downloads a vCard for ACTIVE profiles with safe headers", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_ROW));
    const res = await GET(
      new Request("http://localhost:3000/api/vcard/ahmed-benali"),
      ctx("ahmed-benali"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/vcard; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="ahmed-benali.vcf"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    expect(body).toContain("FN:Ahmed Benali");
    expect(body).toContain("TEL;");
    // Hostile stored website never becomes an executable URL; the only
    // URL line is the canonical profile URL.
    expect(body).not.toContain("javascript:");
    expect(body.match(/^URL:/gm)).toEqual(["URL:"]);
  });

  it("returns plain 404 for DRAFT, INACTIVE, and unknown slugs", async () => {
    for (const row of [
      { ...ACTIVE_ROW, status: "DRAFT" },
      { ...ACTIVE_ROW, status: "INACTIVE" },
      null,
    ]) {
      vi.mocked(createAdminClient).mockReturnValue(fakeDb(row));
      const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Not found");
    }
  });

  it("returns 404 when server reads are misconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing env");
    });
    const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
    expect(res.status).toBe(404);
  });
});
