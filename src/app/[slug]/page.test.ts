import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { getCachedPublicProfileBySlug } from "@/features/profiles/publicCache";

vi.mock("server-only", () => ({}));
vi.mock("@/features/profiles/publicCache", () => ({ getCachedPublicProfileBySlug: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import PublicProfilePage, { generateMetadata } from "./page";

const ACTIVE_PROFILE = {
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

const ACTIVE_DATA = { profile: ACTIVE_PROFILE, links: [] };

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
let savedUrl: string | undefined;
let savedAnon: string | undefined;

beforeEach(() => {
  vi.mocked(getCachedPublicProfileBySlug).mockReset();
  savedUrl = process.env[ENV_URL];
  savedAnon = process.env[ENV_ANON];
  process.env[ENV_URL] = "https://cdn.example";
  process.env[ENV_ANON] = "test-anon-key";
});

afterEach(() => {
  if (savedUrl === undefined) delete process.env[ENV_URL];
  else process.env[ENV_URL] = savedUrl;
  if (savedAnon === undefined) delete process.env[ENV_ANON];
  else process.env[ENV_ANON] = savedAnon;
});

/** The page returns a fragment (preconnect links + view) — dig out the view. */
function findView(element: unknown) {
  const root = element as { props: { children: unknown } };
  const children = root.props.children as unknown[];
  const flat = children.flat(Infinity as 1) as {
    type?: unknown;
    props?: Record<string, unknown>;
  }[];
  const view = flat.find((child) => child?.type === PublicProfileView);
  if (!view) throw new Error("PublicProfileView not found in page output");
  return view.props as Record<string, unknown>;
}

describe("generateMetadata /[slug]", () => {
  it("exposes title, description, and noindex for ACTIVE profiles", async () => {
    vi.mocked(getCachedPublicProfileBySlug).mockResolvedValue(ACTIVE_DATA as never);
    const meta = await generateMetadata(props("ahmed-benali"));
    expect(meta.title).toContain("Ahmed Benali");
    expect(meta.description).toContain("Developer");
    expect(meta.robots).toEqual({ index: false, follow: false });
    const og = meta.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0]?.url).toContain("cdn.example");
  });

  it("exposes no identity for DRAFT, INACTIVE, or unknown slugs", async () => {
    vi.mocked(getCachedPublicProfileBySlug).mockResolvedValue(null);
    const meta = await generateMetadata(props("ahmed-benali"));
    expect(meta).toEqual({
      title: "Profile unavailable | Karti",
      robots: { index: false, follow: false },
    });
    expect(JSON.stringify(meta)).not.toContain("Ahmed Benali");
  });

  it("fails closed when server reads are misconfigured", async () => {
    delete process.env[ENV_URL];
    delete process.env[ENV_ANON];
    const meta = await generateMetadata(props("ahmed-benali"));
    expect(meta).toEqual({ title: "Karti", robots: { index: false, follow: false } });
    expect(getCachedPublicProfileBySlug).not.toHaveBeenCalled();
  });
});

describe("PublicProfilePage /[slug]", () => {
  it("renders the public view with resolved asset URLs for ACTIVE profiles", async () => {
    vi.mocked(getCachedPublicProfileBySlug).mockResolvedValue(ACTIVE_DATA as never);
    const element = await PublicProfilePage(props("ahmed-benali"));
    const viewProps = findView(element);
    expect(viewProps.links).toEqual([]);
    expect(viewProps.avatarUrl).toContain("cdn.example");
    expect(viewProps.coverUrl).toBeNull();
    expect(viewProps.profile).toMatchObject({ slug: "ahmed-benali", status: "ACTIVE" });
  });

  it("notFounds missing profiles and misconfigured reads without leaking", async () => {
    vi.mocked(getCachedPublicProfileBySlug).mockResolvedValue(null);
    await expect(PublicProfilePage(props("ahmed-benali"))).rejects.toThrow("NEXT_NOT_FOUND");
    delete process.env[ENV_URL];
    delete process.env[ENV_ANON];
    await expect(PublicProfilePage(props("ahmed-benali"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
