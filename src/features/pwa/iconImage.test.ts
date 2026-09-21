import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import sharp from "sharp";
import { getCachedPublicProfileByCode } from "@/features/profiles/publicCache";

vi.mock("server-only", () => ({}));
vi.mock("@/features/profiles/publicCache", () => ({ getCachedPublicProfileByCode: vi.fn() }));

import { renderProfileIcon, serveProfileIcon } from "./iconImage";

const ACTIVE_PROFILE = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  profile_type: "PERSON",
  slug: "ilyas-el-moch",
  public_code: "A8K29MPQ2Z",
  display_name: "Ilyas El Moch",
  job_title: null,
  company_name: null,
  bio: null,
  avatar_path: "profiles/123e4567-e89b-12d3-a456-426614174001/avatar/abcdef0123456789.webp",
  cover_path: null,
  phone: null,
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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
let savedUrl: string | undefined;
let savedAnon: string | undefined;

beforeEach(() => {
  vi.mocked(getCachedPublicProfileByCode).mockReset();
  vi.unstubAllGlobals();
  savedUrl = process.env[ENV_URL];
  savedAnon = process.env[ENV_ANON];
  process.env[ENV_URL] = "https://cdn.example";
  process.env[ENV_ANON] = "test-anon-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (savedUrl === undefined) delete process.env[ENV_URL];
  else process.env[ENV_URL] = savedUrl;
  if (savedAnon === undefined) delete process.env[ENV_ANON];
  else process.env[ENV_ANON] = savedAnon;
});

/** Non-square source (must be center-cropped, not stretched). */
async function widePng(): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();
}

describe("renderProfileIcon", () => {
  it("center-crops the avatar to the requested square PNG", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const source = await widePng();
    const body = Uint8Array.from(source);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );
    const rendered = await renderProfileIcon("a8k29mpq2z", "icon-192.png");
    expect(rendered).not.toBeNull();
    expect(rendered?.png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    const meta = await sharp(rendered?.png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
  });

  it("renders the 512 variant at full size from the same avatar", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const source = await widePng();
    const body = Uint8Array.from(source);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );
    const rendered = await renderProfileIcon("A8K29MPQ2Z", "icon-512.png");
    const meta = await sharp(rendered?.png).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("pads the 512 maskable variant so edges carry the accent backdrop", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    const source = await widePng();
    const body = Uint8Array.from(source);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );
    const rendered = await renderProfileIcon("A8K29MPQ2Z", "icon-512.png");
    expect(rendered).not.toBeNull();
    // Corner pixel must be the accent backdrop (#123456 from ACTIVE_DATA),
    // proving the safe-zone pad — not a stretched face.
    const { data } = await sharp(rendered?.png).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([0x12, 0x34, 0x56]);
  });

  it("falls back to the initials tile when no avatar exists", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue({
      profile: { ...ACTIVE_PROFILE, avatar_path: null },
      links: [],
    } as never);
    const fetchSpy = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    const rendered = await renderProfileIcon("A8K29MPQ2Z", "icon-192.png");
    expect(fetchSpy).not.toHaveBeenCalled();
    const meta = await sharp(rendered?.png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
  });

  it("falls back when the avatar fetch fails or returns non-image bytes", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(ACTIVE_DATA as never);
    for (const body of [
      new Response(null, { status: 404 }),
      new Response("<html>not an image</html>", { status: 200 }),
      new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), { status: 200 }),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => body),
      );
      const rendered = await renderProfileIcon("A8K29MPQ2Z", "apple-touch-icon.png");
      const meta = await sharp(rendered?.png).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(180);
      expect(meta.height).toBe(180);
    }
  });

  it("returns null for unknown codes and loader failures (caller → 404)", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    expect(await renderProfileIcon("ZZZZZZZZZZ", "icon-192.png")).toBeNull();
    vi.mocked(getCachedPublicProfileByCode).mockRejectedValue(new Error("db down"));
    expect(await renderProfileIcon("A8K29MPQ2Z", "icon-192.png")).toBeNull();
  });
});

describe("serveProfileIcon", () => {
  it("serves PNG bytes with locked headers for ACTIVE profiles", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue({
      profile: { ...ACTIVE_PROFILE, avatar_path: null },
      links: [],
    } as never);
    const res = await serveProfileIcon("A8K29MPQ2Z", "icon-192.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
  });

  it("returns plain 404 for unknown codes", async () => {
    vi.mocked(getCachedPublicProfileByCode).mockResolvedValue(null);
    const res = await serveProfileIcon("ZZZZZZZZZZ", "icon-512.png");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });
});
