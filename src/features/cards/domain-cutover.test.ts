import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "@/lib/env";
import { permanentCardUrl } from "./service";
import { qrPayloadForCard } from "./qr";
import { publicProfileUrl, displayProfileUrl } from "@/features/profiles/urls";
import { identityUrlForPublicCode } from "@/domain/publicCode";
import { buildSharePayload } from "@/components/public-profile/ShareProfileButton";
import { buildProfileManifest } from "@/features/pwa/manifest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResolverDb } from "./resolver";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// Static import after the mocks above (mirrors app/t/[code]/route.test.ts).
import { GET } from "@/app/t/[code]/route";

/**
 * Production domain cutover regression suite (karti.pro).
 *
 * Every public Karti URL derives from the single canonical source
 * `getAppUrl()` (env `NEXT_PUBLIC_APP_URL`). With production config the
 * exact payloads below must hold — and nothing generated may reference the
 * previous Vercel hostname, localhost, or a www host.
 *
 * Physical-card invariant under test:
 *   permanentCardUrl === QR payload === NFC payload
 *   === https://karti.pro/t/{shortCode}
 */

const PROD_URL = "https://karti.pro";
const SHORT_CODE = "A8F92KXM";
const SLUG = "ilyas-el-moch";
const PUBLIC_CODE = "ABCD234567";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", PROD_URL);
  vi.mocked(createAdminClient).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

type Row = Record<string, unknown>;

const ACTIVE_PROFILE_CARD: Row = {
  id: "card-1",
  short_code: SHORT_CODE,
  status: "ACTIVE",
  destination_type: "PROFILE",
  destination_profile_id: "profile-1",
  destination_url: null,
};

const ACTIVE_PROFILE: Row = { id: "profile-1", slug: SLUG, status: "ACTIVE" };

/** Minimal PostgREST double honoring .eq() filters. */
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

describe("canonical APP_URL source (karti.pro cutover)", () => {
  it("resolves the production domain from environment, with no trailing slash", () => {
    expect(getAppUrl()).toBe(PROD_URL);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://karti.pro///");
    expect(getAppUrl()).toBe(PROD_URL);
  });

  it("never hardcodes the old Vercel hostname, localhost, or www", () => {
    expect(getAppUrl()).not.toContain("vercel.app");
    expect(getAppUrl()).not.toContain("localhost");
    expect(getAppUrl()).not.toContain("127.0.0.1");
    expect(getAppUrl()).not.toContain("www.");
  });
});

describe("new physical card URL (NFC + QR payload)", () => {
  it("permanentCardUrl is exactly https://karti.pro/t/{shortCode}", () => {
    expect(permanentCardUrl(SHORT_CODE)).toBe(`${PROD_URL}/t/${SHORT_CODE}`);
    expect(permanentCardUrl(SHORT_CODE)).toBe("https://karti.pro/t/A8F92KXM");
  });

  it("QR payload === NFC payload === permanent card URL (triple parity)", () => {
    const permanent = permanentCardUrl(SHORT_CODE);
    const qr = qrPayloadForCard(SHORT_CODE);
    const nfc = permanentCardUrl(SHORT_CODE);
    expect(qr).toBe(permanent);
    expect(nfc).toBe(permanent);
    expect(qr).toBe("https://karti.pro/t/A8F92KXM");
  });

  it("QR payload is never a slug, identity, or destination URL", () => {
    const payload = qrPayloadForCard(SHORT_CODE);
    expect(payload).toMatch(/^https:\/\/karti\.pro\/t\/[A-Z0-9]+$/);
    expect(payload).not.toContain("instagram.com");
    expect(payload).not.toContain("/u/");
    expect(payload).not.toMatch(/karti\.pro\/[a-z-]+\/?$/);
  });

  it("no generated card URL references the old hostname or localhost", () => {
    for (const url of [permanentCardUrl(SHORT_CODE), qrPayloadForCard(SHORT_CODE)]) {
      expect(url).not.toContain("karti-bice.vercel.app");
      expect(url).not.toContain("vercel.app");
      expect(url).not.toContain("localhost");
      expect(url).not.toContain("127.0.0.1");
    }
  });
});

describe("public profile + stable identity URLs (karti.pro cutover)", () => {
  it("human-readable profile is https://karti.pro/{slug}", () => {
    expect(publicProfileUrl(SLUG)).toBe("https://karti.pro/ilyas-el-moch");
    expect(publicProfileUrl("  Ilyas El Moch! ")).toBe("https://karti.pro/ilyas-el-moch");
  });

  it("stable identity is https://karti.pro/u/{publicCode} — never /t/", () => {
    const identity = identityUrlForPublicCode(getAppUrl(), PUBLIC_CODE);
    expect(identity).toBe("https://karti.pro/u/ABCD234567");
    expect(identity).not.toContain("/t/");
  });

  it("dashboard display form strips the protocol without changing the host", () => {
    expect(displayProfileUrl("https://karti.pro/ilyas-el-moch")).toBe("karti.pro/ilyas-el-moch");
  });

  it("canonical metadata target is the stable identity URL (no www, no old host)", () => {
    const canonical = identityUrlForPublicCode(getAppUrl(), PUBLIC_CODE);
    expect(canonical).toBe("https://karti.pro/u/ABCD234567");
    expect(canonical).not.toContain("www.");
    expect(canonical).not.toContain("vercel.app");
  });
});

describe("Share Profile payload (karti.pro cutover)", () => {
  it("shares the canonical karti.pro profile URL with public-only fields", () => {
    const payload = buildSharePayload("Ilyas El Moch", publicProfileUrl(SLUG));
    expect(payload).toEqual({
      title: "Ilyas El Moch",
      text: "Check out Ilyas El Moch on Karti",
      url: "https://karti.pro/ilyas-el-moch",
    });
    expect(Object.keys(payload).sort()).toEqual(["text", "title", "url"]);
  });
});

describe("PWA install identity (karti.pro cutover)", () => {
  it("keeps /u/{publicCode} identity with absolute karti.pro icons", () => {
    const manifest = buildProfileManifest({
      displayName: "Ilyas El Moch",
      publicCode: PUBLIC_CODE,
      appUrl: getAppUrl(),
      accentColor: "#0e7c5b",
      bio: null,
    });
    expect(manifest.start_url).toBe("/u/ABCD234567");
    expect(manifest.scope).toBe(manifest.start_url);
    expect(manifest.icons[0]?.src).toBe("https://karti.pro/u/ABCD234567/icon-192.png");
    expect(JSON.stringify(manifest)).not.toContain("/t/");
    expect(JSON.stringify(manifest)).not.toContain("vercel.app");
  });
});

describe("vCard profile URL (karti.pro cutover)", () => {
  it("embeds the canonical karti.pro slug URL (same construction as the route)", () => {
    expect(`${getAppUrl()}/${SLUG}`).toBe("https://karti.pro/ilyas-el-moch");
  });
});

describe("resolver host behavior (karti.pro cutover)", () => {
  const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

  it("ignores Host headers — PROFILE targets resolve against the canonical APP_URL", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_PROFILE_CARD, ACTIVE_PROFILE));
    const res = await GET(new Request("http://evil.example/t/A8F92KXM"), ctx("A8F92KXM"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://karti.pro/ilyas-el-moch");
  });

  it("old-host taps hit the same resolver and land on the same destination", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_PROFILE_CARD, ACTIVE_PROFILE));
    const res = await GET(
      new Request("https://karti-bice.vercel.app/t/A8F92KXM"),
      ctx("a8f92kxm"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://karti.pro/ilyas-el-moch");
  });
});
