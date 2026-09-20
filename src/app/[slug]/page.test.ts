import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import type { Database } from "@/types/database";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import PublicProfilePage, { generateMetadata } from "./page";

const ACTIVE_ROW = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  display_name: "Ahmed Benali",
  job_title: "Developer",
  company_name: "Atlas Studio",
  bio: "Short bio.",
  avatar_path: "profiles/123e4567-e89b-12d3-a456-426614174001/avatar/abcdef0123456789.png",
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#0e7c5b",
  theme: "light",
  status: "ACTIVE",
};

/** Fake admin client: query behavior + pure getPublicUrl string-building. */
function fakeAdmin(profile: Record<string, unknown> | null): SupabaseClient<Database> {
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
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("generateMetadata /[slug]", () => {
  it("exposes title, description, and noindex for ACTIVE profiles", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeAdmin(ACTIVE_ROW));
    const meta = await generateMetadata(props("ahmed-benali"));
    expect(meta.title).toContain("Ahmed Benali");
    expect(meta.description).toContain("Developer");
    expect(meta.robots).toEqual({ index: false, follow: false });
    const og = meta.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0]?.url).toContain("cdn.example");
  });

  it("exposes no identity for DRAFT, INACTIVE, or unknown slugs", async () => {
    for (const row of [
      { ...ACTIVE_ROW, status: "DRAFT" },
      { ...ACTIVE_ROW, status: "INACTIVE" },
      null,
    ]) {
      vi.mocked(createAdminClient).mockReturnValue(fakeAdmin(row));
      const meta = await generateMetadata(props("ahmed-benali"));
      expect(meta).toEqual({
        title: "Profile unavailable | Karti",
        robots: { index: false, follow: false },
      });
      expect(JSON.stringify(meta)).not.toContain("Ahmed Benali");
    }
  });

  it("fails closed when server reads are misconfigured", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing env");
    });
    const meta = await generateMetadata(props("ahmed-benali"));
    expect(meta).toEqual({ title: "Karti", robots: { index: false, follow: false } });
  });
});

describe("PublicProfilePage /[slug]", () => {
  it("renders the public view with resolved asset URLs for ACTIVE profiles", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeAdmin(ACTIVE_ROW));
    const element = (await PublicProfilePage(props("ahmed-benali"))) as unknown as {
      type: unknown;
      props: Record<string, unknown>;
    };
    expect(element.type).toBe(PublicProfileView);
    expect(element.props.links).toEqual([]);
    expect(element.props.avatarUrl).toContain("cdn.example");
    expect(element.props.coverUrl).toBeNull();
    expect(element.props.profile).toMatchObject({ slug: "ahmed-benali", status: "ACTIVE" });
  });

  it("notFounds DRAFT profiles and misconfigured reads without leaking", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeAdmin({ ...ACTIVE_ROW, status: "DRAFT" }));
    await expect(PublicProfilePage(props("ahmed-benali"))).rejects.toThrow("NEXT_NOT_FOUND");
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("missing env");
    });
    await expect(PublicProfilePage(props("ahmed-benali"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
