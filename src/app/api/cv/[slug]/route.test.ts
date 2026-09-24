import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicDb } from "@/features/profiles/public";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET, resolveCvFilePath } from "./route";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174001";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174003";
const CV_PATH = `${CLIENT_ID}/sections/cv/abcdef0123456789.pdf`;
const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 minimal");

const ACTIVE_ROW = {
  id: PROFILE_ID,
  profile_type: "PERSON",
  slug: "ahmed-benali",
  public_code: "ABCD234567",
  display_name: "Ahmed Benali",
  job_title: null,
  company_name: null,
  bio: null,
  avatar_path: null,
  cover_path: null,
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  maps_url: null,
  accent_color: null,
  theme: "light",
  status: "ACTIVE",
};

/**
 * Fake: profiles honor slug/status filters with embedded sections;
 * profile_sections honors profile/type/enabled filters; storage.download
 * serves PDF bytes for the known path only.
 */
function fakeDb(
  options: {
    profile?: Record<string, unknown> | null;
    sectionSettings?: unknown;
    sectionEnabled?: boolean;
    downloadError?: boolean;
  } = {},
): PublicDb {
  const {
    profile = ACTIVE_ROW,
    sectionSettings = { file: CV_PATH },
    sectionEnabled = true,
  } = options;
  const profileFilters: [string, unknown][] = [];
  const profileQuery: Record<string, unknown> = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn((column: string, value: unknown) => {
      profileFilters.push([column, value]);
      return profileQuery;
    }),
    maybeSingle: vi.fn(async () => {
      const matches =
        profile !== null &&
        profileFilters.every(
          ([column, value]) => (profile as Record<string, unknown>)[column] === value,
        );
      if (!matches) return { data: null, error: null };
      return {
        data: {
          ...profile,
          profile_links: [],
          profile_sections: [
            {
              id: "sec-cv",
              type: "cv",
              position: 4,
              enabled: sectionEnabled,
              settings: sectionSettings,
            },
          ],
        },
        error: null,
      };
    }),
  };
  const sectionFilters: [string, unknown][] = [];
  const sectionQuery: Record<string, unknown> = {
    select: vi.fn(() => sectionQuery),
    eq: vi.fn((column: string, value: unknown) => {
      sectionFilters.push([column, value]);
      return sectionQuery;
    }),
    maybeSingle: vi.fn(async () => {
      if (!sectionEnabled) return { data: null, error: null };
      const wanted: [string, unknown][] = [
        ["profile_id", PROFILE_ID],
        ["type", "cv"],
        ["enabled", true],
      ];
      const matches = wanted.every(([c, v]) =>
        sectionFilters.some(([fc, fv]) => fc === c && fv === v),
      );
      if (!matches) return { data: null, error: null };
      return { data: { settings: sectionSettings }, error: null };
    }),
  };
  const download = vi.fn(async (path: string) => {
    if (options.downloadError || path !== CV_PATH) return { data: null, error: { message: "x" } };
    return { data: new Blob([PDF_BYTES], { type: "application/pdf" }), error: null };
  });
  return {
    from: vi.fn((t: string) => (t === "profiles" ? profileQuery : sectionQuery)),
    storage: { from: vi.fn(() => ({ download })) },
  } as unknown as PublicDb;
}

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("resolveCvFilePath", () => {
  it("accepts only managed private-bucket document paths", () => {
    expect(resolveCvFilePath({ file: CV_PATH })).toBe(CV_PATH);
    expect(resolveCvFilePath({ file: "" })).toBeNull();
    expect(resolveCvFilePath({})).toBeNull();
    expect(resolveCvFilePath(null)).toBeNull();
    expect(resolveCvFilePath({ file: "https://evil.com/cv.pdf" })).toBeNull();
    expect(resolveCvFilePath({ file: `${CLIENT_ID}/sections/cv/evil.pdf` })).toBeNull();
    expect(resolveCvFilePath({ file: "profiles/abc/avatar/abcdef0123456789.png" })).toBeNull();
  });
});

describe("GET /api/cv/[slug]", () => {
  it("streams the PDF inline for ACTIVE profiles with a CV", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb());
    const res = await GET(
      new Request("http://localhost:3000/api/cv/ahmed-benali"),
      ctx("ahmed-benali"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('inline; filename="ahmed-benali-cv.pdf"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(PDF_BYTES);
    expect(res.headers.get("content-length")).toBe(String(PDF_BYTES.byteLength));
  });

  it("returns 404 for DRAFT, unknown, missing, disabled, hostile and failed downloads", async () => {
    const cases: [string, ReturnType<typeof fakeDb>][] = [
      ["draft", fakeDb({ profile: { ...ACTIVE_ROW, status: "DRAFT" } })],
      ["unknown", fakeDb({ profile: null })],
      ["no-file", fakeDb({ sectionSettings: { title: "CV", label: "L", file: "" } })],
      ["disabled", fakeDb({ sectionEnabled: false })],
      ["hostile", fakeDb({ sectionSettings: { file: "https://evil.com/cv.pdf" } })],
      ["failed-download", fakeDb({ downloadError: true })],
    ];
    for (const [name, db] of cases) {
      vi.mocked(createAdminClient).mockReturnValue(db);
      const res = await GET(
        new Request(`http://localhost:3000/api/cv/${name}`),
        ctx(name === "unknown" ? "ghost-slug" : "ahmed-benali"),
      );
      expect(res.status, name).toBe(404);
      expect(await res.text(), name).toBe("Not found");
    }
  });
});
