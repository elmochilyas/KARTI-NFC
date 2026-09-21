import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";

vi.mock("server-only", () => ({}));
vi.mock("@/features/profiles/publicCache", () => ({ getCachedPublicProfileByCode: vi.fn() }));

import { GET } from "./route";

const ACTIVE_PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ilyas-el-moch",
  public_code: "A8K29MPQ2Z",
  display_name: "Ilyas El Moch",
  job_title: "Plumber",
  company_name: "Atlas",
  bio: "Plumber in Casablanca.",
  avatar_path: null,
  cover_path: null,
  phone: "+212600000000",
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: "#123456",
  theme: "light",
  status: "ACTIVE",
};

const ACTIVE_DATA = { profile: ACTIVE_PROFILE, links: [] };

const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const req = (code: string) => new Request(`http://localhost:3000/u/${code}/manifest.webmanifest`);

beforeEach(() => {
  vi.mocked(getCachedPublicProfileByCode).mockReset();
});

describe("GET /u/[code]/manifest.webmanifest", () => {
  it("returns the profile install identity for ACTIVE profiles", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const res = await GET(req("a8k29mpq2z"), ctx("a8k29mpq2z"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const manifest = (await res.json()) as Record<string, unknown>;
    expect(manifest.name).toBe("Ilyas El Moch");
    expect(manifest.short_name).toBe("Ilyas");
    expect(manifest.start_url).toBe("/u/A8K29MPQ2Z");
    expect(manifest.id).toBe("/u/A8K29MPQ2Z");
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBe("/u/A8K29MPQ2Z");
    expect(manifest.theme_color).toBe("#123456");
    const icons = manifest.icons as { src: string; sizes: string; type: string; purpose?: string }[];
    expect(icons).toHaveLength(3);
    expect(icons[0]).toMatchObject({
      sizes: "192x192",
      type: "image/png",
    });
    expect(icons[0]?.src).toContain("/u/A8K29MPQ2Z/icon-192.png");
    expect(icons[1]?.src).toContain("/u/A8K29MPQ2Z/icon-512.png");
    expect(icons[2]).toMatchObject({
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    });
  });

  it("never points start_url at a slug or an NFC /t/ destination", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const res = await GET(req("A8K29MPQ2Z"), ctx("A8K29MPQ2Z"));
    const body = await res.text();
    expect(body).not.toContain("/t/");
    expect(body).not.toContain("ilyas-el-moch");
  });

  it("returns plain 404 for DRAFT, INACTIVE, and unknown codes", async () => {
    // The ACTIVE-only gate lives in getCachedPublicProfileByCode (null for
    // DRAFT/INACTIVE/unknown alike); the route maps every null to one
    // generic 404 without revealing which case it is.
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    for (const code of ["A8K29MPQ2Z", "ZZZZZZZZZZ"]) {
      const res = await GET(req(code), ctx(code));
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Not found");
    }
  });

  it("rejects malformed codes without leaking existence", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    for (const code of ["short", "../../../etc", "A8K29MPQ2Z/../../t/X", ""]) {
      const res = await GET(req(code), ctx(code));
      expect(res.status).toBe(404);
    }
    expect(JSON.stringify(await GET(req("nope"), ctx("nope")))).not.toContain("Ilyas");
  });

  it("exposes no private fields in the manifest body", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue({
      profile: {
        ...ACTIVE_PROFILE,
        // Simulates an over-selected row: none of these may leak.
        client_id: "123e4567-e89b-12d3-a456-426614174999",
        card_number: "KARTI-000001",
      },
      links: [],
    } as never);
    const res = await GET(req("A8K29MPQ2Z"), ctx("A8K29MPQ2Z"));
    const body = await res.text();
    expect(body).not.toContain("426614174999");
    expect(body).not.toContain("KARTI-000001");
    expect(body).not.toContain("client_id");
  });

  it("fails closed when the loader throws", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockRejectedValue(new Error("db down"));
    const res = await GET(req("A8K29MPQ2Z"), ctx("A8K29MPQ2Z"));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });
});
