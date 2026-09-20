import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicDb } from "@/features/profiles/public";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET, stripVcfExtension } from "./route";

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
  it("serves a vCard for ACTIVE profiles with native-preview headers", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_ROW));
    const res = await GET(
      new Request("http://localhost:3000/api/vcard/ahmed-benali"),
      ctx("ahmed-benali"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/vcard; charset=utf-8");
    // Inline (not attachment) so iOS/Android open the native contact
    // preview instead of a Files/Downloads detour.
    expect(res.headers.get("content-disposition")).toBe(
      "inline; filename=\"ahmed-benali.vcf\"; filename*=UTF-8''ahmed-benali.vcf",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.text();
    expect(body).toContain("FN:Ahmed Benali");
    expect(body).toContain("N:;;;;");
    expect(body).toContain("TEL;");
    expect(res.headers.get("content-length")).toBe(String(Buffer.byteLength(body, "utf8")));
    // Hostile stored website never becomes an executable URL; the only
    // URL line is the canonical profile URL.
    expect(body).not.toContain("javascript:");
    expect(body.match(/^URL:/gm)).toEqual(["URL:"]);
  });

  it("pre-fills all available PERSON contact fields", async () => {
    const row = {
      ...ACTIVE_ROW,
      job_title: "Développeur",
      company_name: "Atlas, SARL",
      phone: "+212 6 12 34 56 78",
      email: "ahmed@atlas.ma",
      website: "https://atlas.ma",
      address: "12, Rue de l'Église; Marrakech",
    };
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(row));
    const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("FN:Ahmed Benali\r\n");
    expect(body).toContain("N:;;;;\r\n");
    expect(body).toContain("ORG:Atlas\\, SARL\r\n");
    expect(body).toContain("TITLE:Développeur\r\n");
    expect(body).toContain("TEL;TYPE=CELL,VOICE:+212 6 12 34 56 78\r\n");
    expect(body).toContain("EMAIL;TYPE=INTERNET:ahmed@atlas.ma\r\n");
    expect(body).toContain("URL:https://atlas.ma\r\n");
    expect(body).toContain("ADR;TYPE=HOME:;;12\\, Rue de l'Église\\; Marrakech;;;;\r\n");
    // CRLF-only line endings, no bare LF.
    expect(body).not.toMatch(/[^\r]\n/);
    expect(body.endsWith("\r\n")).toBe(true);
  });

  it("maps BUSINESS profiles with ORG fallback and category title", async () => {
    const row = {
      ...ACTIVE_ROW,
      profile_type: "BUSINESS",
      display_name: "Café Noir",
      job_title: "Restaurant",
      company_name: null,
      phone: null,
      whatsapp: "+212612345678",
      website: "https://cafe-noir.ma",
    };
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(row));
    const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("FN:Café Noir\r\n");
    expect(body).toContain("ORG:Café Noir\r\n");
    expect(body).toContain("TITLE:Restaurant\r\n");
    // WhatsApp doubles as the voice number only when no phone exists.
    expect(body).toContain("TEL;TYPE=CELL,VOICE:+212612345678\r\n");
    expect(body).not.toContain("wa.me");
  });

  it("keeps Arabic, French, and apostrophes intact while neutralizing injection", async () => {
    const row = {
      ...ACTIVE_ROW,
      display_name: "أحمد بن علي",
      job_title: "Développeur — café & crème",
      company_name: "Evil\r\nTEL:+1999",
      email: "a@x.com\r\nBcc:evil@x.com",
      website: "javascript:alert(1)",
      address: "12, Rue d'Agadir; Rabat",
    };
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(row));
    const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("FN:أحمد بن علي\r\n");
    expect(body).toContain("TITLE:Développeur — café & crème\r\n");
    expect(body).toContain("ORG:Evil\\nTEL:+1999\r\n");
    expect(body).toContain("ADR;TYPE=HOME:;;12\\, Rue d'Agadir\\; Rabat;;;;\r\n");
    expect(body).not.toContain("javascript:");
    expect(body).not.toMatch(/[^\r]\n/);
    // No injected TEL property beyond the real one (row has a real phone).
    expect(body.match(/^TEL;/gm)?.length).toBe(1);
  });

  it("exposes only public contact fields, never private metadata", async () => {
    const row = {
      ...ACTIVE_ROW,
      // Simulates a hostile/over-selected row: none of these may leak.
      client_notes: "secret note",
      client_id: "123e4567-e89b-12d3-a456-426614174999",
      card_number: "KARTI-000001",
      dashboard_url: "https://admin.example/dashboard",
    };
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(row));
    const res = await GET(new Request("http://localhost:3000/api/vcard/x"), ctx("ahmed-benali"));
    const body = await res.text();
    expect(body).not.toContain("secret note");
    expect(body).not.toContain("426614174999");
    expect(body).not.toContain("KARTI-000001");
    expect(body).not.toContain("admin.example");
    expect(body).not.toContain("client_notes");
    expect(body).not.toContain("undefined");
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

describe("stripVcfExtension", () => {
  it("strips a trailing .vcf suffix case-insensitively", () => {
    expect(stripVcfExtension("ahmed-benali.vcf")).toBe("ahmed-benali");
    expect(stripVcfExtension("ahmed-benali.VCF")).toBe("ahmed-benali");
    expect(stripVcfExtension("ahmed-benali.Vcf")).toBe("ahmed-benali");
  });

  it("leaves extension-less slugs untouched", () => {
    expect(stripVcfExtension("ahmed-benali")).toBe("ahmed-benali");
    expect(stripVcfExtension("")).toBe("");
    expect(stripVcfExtension(".vcf")).toBe("");
  });
});

describe("GET /api/vcard/[slug].vcf alias", () => {
  it("serves the byte-identical inline vCard for the .vcf-suffixed URL", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_ROW));
    const plain = await GET(
      new Request("http://localhost:3000/api/vcard/ahmed-benali"),
      ctx("ahmed-benali"),
    );
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_ROW));
    const aliased = await GET(
      new Request("http://localhost:3000/api/vcard/ahmed-benali.vcf"),
      ctx("ahmed-benali.vcf"),
    );
    expect(aliased.status).toBe(200);
    expect(aliased.headers.get("content-type")).toBe("text/vcard; charset=utf-8");
    // Filename comes from the stored slug, never the raw `.vcf` suffix.
    expect(aliased.headers.get("content-disposition")).toBe(
      "inline; filename=\"ahmed-benali.vcf\"; filename*=UTF-8''ahmed-benali.vcf",
    );
    expect(aliased.headers.get("cache-control")).toBe("no-store");
    expect(await aliased.text()).toBe(await plain.text());
  });

  it("resolves case variations of the suffix without leaking existence", async () => {
    vi.mocked(createAdminClient).mockReturnValue(fakeDb(ACTIVE_ROW));
    const res = await GET(
      new Request("http://localhost:3000/api/vcard/Ahmed-Benali.VCF"),
      ctx("Ahmed-Benali.VCF"),
    );
    expect(res.status).toBe(200);

    for (const slug of [".vcf", "unknown-slug.vcf"]) {
      vi.mocked(createAdminClient).mockReturnValue(fakeDb(null));
      const missing = await GET(
        new Request(`http://localhost:3000/api/vcard/${slug}`),
        ctx(slug),
      );
      expect(missing.status).toBe(404);
      expect(await missing.text()).toBe("Not found");
    }
  });
});
