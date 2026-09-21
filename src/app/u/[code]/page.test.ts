import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";

vi.mock("server-only", () => ({}));
vi.mock("@/features/profiles/publicCache", () => ({ getCachedPublicProfileByCode: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import IdentityProfilePage, { generateMetadata } from "./page";

const ACTIVE_PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ahmed-benali",
  public_code: "ABCD234567",
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
const props = (code: string) => ({ params: Promise.resolve({ code }) });

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
let savedUrl: string | undefined;
let savedAnon: string | undefined;

beforeEach(() => {
  vi.mocked(getCachedPublicProfileByCode).mockReset();
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

describe("generateMetadata /u/[code]", () => {
  it("exposes title, canonical identity URL, and noindex", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const meta = await generateMetadata(props("abcd234567"));
    expect(meta.title).toContain("Ahmed Benali");
    const alternates = meta.alternates as { canonical?: string } | undefined;
    // Canonical is built from the app URL + stored code (slug-independent).
    expect(alternates?.canonical).toContain("/u/ABCD234567");
    expect(alternates?.canonical).not.toContain("/t/");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("links the profile-specific PWA manifest and touch icon", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const meta = await generateMetadata(props("ABCD234567"));
    // Manifest identity is the immutable /u/{code} — never slug, never /t/.
    expect(meta.manifest).toBe("/u/ABCD234567/manifest.webmanifest");
    expect(String(meta.manifest)).not.toContain("/t/");
    expect(String(meta.manifest)).not.toContain("ahmed-benali");
    expect(meta.themeColor).toBe("#0e7c5b");
    const icons = meta.icons as { apple?: string } | undefined;
    expect(icons?.apple).toBe("/u/ABCD234567/apple-touch-icon.png");
  });

  it("exposes no identity for unknown codes", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    const meta = await generateMetadata(props("ZZZZZZZZZZ"));
    expect(meta).toEqual({
      title: "Profile unavailable | Karti",
      robots: { index: false, follow: false },
    });
    expect(JSON.stringify(meta)).not.toContain("Ahmed Benali");
    expect("manifest" in meta).toBe(false);
  });

  it("fails closed when server reads are misconfigured", async () => {
    delete process.env[ENV_URL];
    delete process.env[ENV_ANON];
    const meta = await generateMetadata(props("ABCD234567"));
    expect(meta).toEqual({ title: "Karti", robots: { index: false, follow: false } });
    expect(getCachedPublicProfileByCode).not.toHaveBeenCalled();
  });
});

describe("IdentityProfilePage /u/[code]", () => {
  it("renders the public view with identity data for ACTIVE profiles", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const element = await IdentityProfilePage(props("abcd234567"));
    const viewProps = findView(element);
    expect(viewProps.profile).toMatchObject({ slug: "ahmed-benali", public_code: "ABCD234567" });
    expect(viewProps.links).toEqual([]);
  });

  it("notFounds missing profiles and misconfigured reads without leaking", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    await expect(IdentityProfilePage(props("ZZZZZZZZZZ"))).rejects.toThrow("NEXT_NOT_FOUND");
    delete process.env[ENV_URL];
    delete process.env[ENV_ANON];
    await expect(IdentityProfilePage(props("ABCD234567"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
