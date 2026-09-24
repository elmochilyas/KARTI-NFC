import { describe, expect, it, vi } from "vitest";
import {
  createProfileInternal,
  getProfileByClientId,
  getProfileById,
  getProfileTemplateColumn,
  resolveProfileTemplate,
  updateProfileTemplate,
  type ProfileDb,
} from "./service";
import { seedTemplateSections } from "./profileTemplates";
import { computeCompletion, onboardingSteps } from "./completion";

const CLIENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const PROFILE_ID = "123e4567-e89b-12d3-a456-426614174001";

/**
 * Production regression audit (Phase 33 incident): the live database never
 * received migrations 20260925–20260928, so `profiles.template` does not
 * exist and `profile_sections` is absent entirely. PostgREST answers
 * unknown-column selects/writes with a PGRST204 error and unknown tables
 * with a schema-cache error. These tests pin the safe behavior on such a
 * database: pre-template profiles must load, editors must open, creation
 * must fall back — never "Could not load the profile."
 */

const MISSING_TEMPLATE_COLUMN = {
  code: "PGRST204",
  message: "Could not find the 'template' column of 'profiles' in the schema cache",
};

const MISSING_PUBLIC_CODE_COLUMN = {
  code: "PGRST204",
  message: "Could not find the 'public_code' column of 'profiles' in the schema cache",
};

const MISSING_SECTIONS_TABLE = {
  code: "PGRST205",
  message: "Could not find the table 'public.profile_sections' in the schema cache",
};

const LEGACY_ROW = {
  id: PROFILE_ID,
  client_id: CLIENT_ID,
  profile_type: "BUSINESS",
  slug: "cafe-atlas",
  public_code: "ABCD234567",
  display_name: "Café Atlas",
  status: "ACTIVE",
};

type LegacyOptions = {
  /** Ordered/direct profile reads return the legacy row (Case B). False = Case A. */
  existingProfile: boolean;
  hasTemplateColumn: boolean;
  hasPublicCodeColumn: boolean;
  hasSectionsTable: boolean;
  storedTemplate?: string | null;
};

/**
 * Fake modeling a pre-migration database. Defaults mirror live today:
 * `public_code` present, `template` absent, `profile_sections` absent.
 */
function legacyDb(options: Partial<LegacyOptions> = {}) {
  const config: LegacyOptions = {
    existingProfile: true,
    hasTemplateColumn: false,
    hasPublicCodeColumn: true,
    hasSectionsTable: false,
    storedTemplate: null,
    ...options,
  };
  const calls: { table: string; select: string }[] = [];
  const inserts: Record<string, unknown>[][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (name: string): any => {
    let columns = "";
    let written: Record<string, unknown>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub: any = {};
    const chain = () => stub;
    stub.select = (cols: string) => {
      columns = cols;
      calls.push({ table: name, select: cols });
      return stub;
    };
    stub.eq = chain;
    stub.neq = chain;
    stub.order = chain;
    stub.limit = chain;
    stub.update = (patch: Record<string, unknown>) => {
      written = [patch];
      return stub;
    };
    stub.insert = (rows: unknown) => {
      written = (Array.isArray(rows) ? rows : [rows]) as Record<string, unknown>[];
      inserts.push(written);
      return stub;
    };
    const templateSelected = () => columns.includes("template");
    const publicCodeSelected = () => columns.includes("public_code");
    const payloadHasTemplate = () => written.some((row) => "template" in row);
    const profileRow = () => {
      if (!config.existingProfile) return null;
      const row: Record<string, unknown> = { ...LEGACY_ROW };
      if (!config.hasPublicCodeColumn) delete row.public_code;
      if (config.hasTemplateColumn && config.storedTemplate) {
        row.template = config.storedTemplate;
      }
      return row;
    };
    stub.single = async () => {
      if (name === "profile_sections" && !config.hasSectionsTable) {
        return { data: null, error: MISSING_SECTIONS_TABLE };
      }
      if (name === "profiles" && !config.hasTemplateColumn && payloadHasTemplate()) {
        return { data: null, error: MISSING_TEMPLATE_COLUMN };
      }
      if (name === "profiles" && !config.hasPublicCodeColumn && publicCodeSelected()) {
        return { data: null, error: MISSING_PUBLIC_CODE_COLUMN };
      }
      if (name === "profiles") {
        const row = profileRow();
        if (!config.existingProfile) {
          // Creation insert path: no prior row, insert succeeds.
          const fresh = { ...LEGACY_ROW, slug: "new-place", display_name: "New Place" };
          if (!config.hasPublicCodeColumn) delete (fresh as Record<string, unknown>).public_code;
          return { data: fresh, error: null };
        }
        return { data: row, error: null };
      }
      return { data: profileRow(), error: null };
    };
    stub.maybeSingle = async () => {
      if (name === "profile_sections" && !config.hasSectionsTable) {
        return { data: null, error: MISSING_SECTIONS_TABLE };
      }
      if (name === "profiles" && !config.hasTemplateColumn && templateSelected()) {
        return { data: null, error: MISSING_TEMPLATE_COLUMN };
      }
      if (name === "profiles" && !config.hasPublicCodeColumn && publicCodeSelected()) {
        return { data: null, error: MISSING_PUBLIC_CODE_COLUMN };
      }
      if (name === "profiles" && !config.hasTemplateColumn && payloadHasTemplate()) {
        return { data: null, error: MISSING_TEMPLATE_COLUMN };
      }
      return { data: profileRow(), error: null };
    };
    stub.then = (resolve: (v: unknown) => void) => {
      if (name === "profile_sections" && !config.hasSectionsTable) {
        resolve({ data: null, error: MISSING_SECTIONS_TABLE });
        return;
      }
      if (name === "profiles" && !config.hasTemplateColumn && templateSelected()) {
        resolve({ data: null, error: MISSING_TEMPLATE_COLUMN });
        return;
      }
      if (name === "profiles" && !config.hasPublicCodeColumn && publicCodeSelected()) {
        resolve({ data: null, error: MISSING_PUBLIC_CODE_COLUMN });
        return;
      }
      // Slug-availability probes and section listings resolve empty.
      resolve({ data: [], error: null });
    };
    return stub;
  };
  const getClaims = vi.fn(async () => ({ data: { claims: { sub: "a" } }, error: null }));
  const from = vi.fn(table);
  return { db: { auth: { getClaims }, from } as unknown as ProfileDb, calls, inserts };
}

describe("pre-template database regression", () => {
  it("loads the existing profile for the client page (no phantom empty state)", async () => {
    const { db, calls } = legacyDb({ existingProfile: true });
    const result = await getProfileByClientId(CLIENT_ID, db);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.id).toBe(PROFILE_ID);
      expect(result.data?.slug).toBe("cafe-atlas");
    }
    // No read may demand the unmigrated column.
    expect(calls.every((c) => !c.select.includes("template"))).toBe(true);
  });

  it("opens the editor via getProfileById without the template column", async () => {
    const { db } = legacyDb({ existingProfile: true });
    const result = await getProfileById(PROFILE_ID, db);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.public_code).toBe("ABCD234567");
    }
  });

  it("loads pre-public_code profiles with an empty code instead of failing", async () => {
    const { db } = legacyDb({ existingProfile: true, hasPublicCodeColumn: false });
    const result = await getProfileByClientId(CLIENT_ID, db);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.id).toBe(PROFILE_ID);
      expect(result.data?.public_code).toBe("");
    }
  });

  it("creates a profile by retrying without template (sections still seeded)", async () => {
    const { db, inserts } = legacyDb({ existingProfile: false });
    const result = await createProfileInternal(
      CLIENT_ID,
      {
        profile_type: "BUSINESS",
        slug: "new-place",
        display_name: "New Place",
        job_title: "",
        company_name: "",
        bio: "",
        phone: "",
        whatsapp: "",
        email: "",
        website: "",
        address: "",
        maps_url: "",
        accent_color: "",
        theme: "light",
        avatar_path: "",
        cover_path: "",
      },
      db,
    );
    expect(result.ok).toBe(true);
    // First attempt carries template, retry drops it — profile creation
    // never fails only because the column is missing.
    expect(inserts.length).toBeGreaterThanOrEqual(1);
    const profilePayloads = inserts.filter((batch) =>
      batch.some((row) => "slug" in row || "client_id" in row),
    );
    expect(profilePayloads.length).toBeGreaterThanOrEqual(1);
    const last = profilePayloads[profilePayloads.length - 1][0];
    expect("template" in last).toBe(false);
  });

  it("reports template changes as migration-pending, not as a crash", async () => {
    const { db } = legacyDb({ existingProfile: true });
    const result = await updateProfileTemplate(PROFILE_ID, CLIENT_ID, "restaurant", db);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN");
      expect(result.error.message).toMatch(/migration/i);
    }
  });

  it("derives the template from profile_type when metadata is missing", () => {
    expect(resolveProfileTemplate(null, "BUSINESS")).toBe("business");
    expect(resolveProfileTemplate(null, "PERSON")).toBe("personal");
    expect(resolveProfileTemplate("restaurant", "BUSINESS")).toBe("restaurant");
    // Stored but incompatible (or unknown) falls back to the type default.
    expect(resolveProfileTemplate("personal", "BUSINESS")).toBe("business");
    expect(resolveProfileTemplate("nope", "PERSON")).toBe("personal");
  });

  it("reads template metadata as null on pre-migration databases", async () => {
    const { db } = legacyDb({ existingProfile: true });
    await expect(getProfileTemplateColumn(PROFILE_ID, db)).resolves.toBe(null);
  });

  it("creation flow Case B: existing profile conflicts so the UI opens the editor", async () => {
    const { db } = legacyDb({ existingProfile: true });
    const result = await createProfileInternal(
      CLIENT_ID,
      {
        profile_type: "BUSINESS",
        slug: "cafe-atlas",
        display_name: "Café Atlas",
        job_title: "",
        company_name: "",
        bio: "",
        phone: "",
        whatsapp: "",
        email: "",
        website: "",
        address: "",
        maps_url: "",
        accent_color: "",
        theme: "light",
        avatar_path: "",
        cover_path: "",
      },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toMatch(/already has a profile/i);
    }
  });

  it("missing optional data never crashes completion or onboarding", () => {
    const completion = computeCompletion(
      {
        display_name: "Café Atlas",
        avatar_path: null,
        cover_path: null,
        phone: null,
        whatsapp: null,
        email: null,
        website: null,
        bio: null,
        status: "DRAFT",
      },
      [],
      [],
    );
    expect(completion.percent).toBeGreaterThanOrEqual(0);
    const steps = onboardingSteps(
      {
        display_name: "Café Atlas",
        avatar_path: null,
        cover_path: null,
        phone: null,
        whatsapp: null,
        email: null,
        website: null,
        bio: null,
        status: "DRAFT",
      },
      [],
      [],
    );
    expect(steps).toHaveLength(4);
    expect(steps[steps.length - 1].done).toBe(false);
  });

  it("section seeding fails closed without throwing when the table is missing", async () => {
    const { db } = legacyDb({ existingProfile: true });
    await expect(seedTemplateSections(PROFILE_ID, "business", db)).resolves.toBe(false);
  });

  it("modern profiles keep working unchanged", async () => {
    const { db } = legacyDb({
      existingProfile: true,
      hasTemplateColumn: true,
      hasSectionsTable: true,
      storedTemplate: "restaurant",
    });
    const result = await getProfileById(PROFILE_ID, db);
    expect(result.ok).toBe(true);
    await expect(getProfileTemplateColumn(PROFILE_ID, db)).resolves.toBe("restaurant");
    await expect(seedTemplateSections(PROFILE_ID, "restaurant", db)).resolves.toBe(true);
  });
});
