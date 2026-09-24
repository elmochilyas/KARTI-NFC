import type { SectionsDb } from "./sections";
import type { Json } from "@/types/database";

/**
 * Phase 30 profile templates — which sections a new profile starts with.
 *
 * A template is creation-time metadata: it decides the initial section set
 * (types + enabled flags + settings overrides) and is stored on the profile
 * row for reference. It NEVER drives existing sections — changing the
 * template later updates only the column (see updateProfileTemplate).
 */

export type ProfileTemplateId = "personal" | "business" | "restaurant" | "store";

export type TemplateSection = {
  type: string;
  enabled: boolean;
};

export type ProfileTemplate = {
  id: ProfileTemplateId;
  label: string;
  description: string;
  /** Profile types allowed to use this template (enforced on create). */
  profileType: "PERSON" | "BUSINESS";
  sections: TemplateSection[];
  /** Per-type settings overrides ({} = schema defaults). */
  settings: Record<string, Record<string, unknown>>;
};

const TRIO: TemplateSection[] = [
  { type: "hero", enabled: true },
  { type: "actions", enabled: true },
  { type: "links", enabled: true },
];

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    id: "personal",
    label: "Personal",
    description: "Individual profile: identity, actions and links.",
    profileType: "PERSON",
    sections: [...TRIO],
    settings: {},
  },
  {
    id: "business",
    label: "Business",
    description: "Company profile with location and opening hours.",
    profileType: "BUSINESS",
    sections: [
      ...TRIO,
      { type: "location", enabled: true },
      { type: "opening_hours", enabled: true },
    ],
    settings: {},
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Menu-first profile with location, hours and gallery.",
    profileType: "BUSINESS",
    sections: [
      ...TRIO,
      { type: "location", enabled: true },
      { type: "opening_hours", enabled: true },
      { type: "menu", enabled: true },
      { type: "gallery", enabled: true },
    ],
    settings: {},
  },
  {
    id: "store",
    label: "Store",
    description: "Retail profile with catalog, location and gallery.",
    profileType: "BUSINESS",
    sections: [
      ...TRIO,
      { type: "location", enabled: true },
      { type: "opening_hours", enabled: true },
      { type: "catalog", enabled: true },
      { type: "gallery", enabled: true },
    ],
    settings: {},
  },
];

export function getProfileTemplate(id: string): ProfileTemplate | null {
  return PROFILE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function isProfileTemplateId(value: unknown): value is ProfileTemplateId {
  return typeof value === "string" && PROFILE_TEMPLATES.some((t) => t.id === value);
}

/** Default template for a profile type (used when none is chosen). */
export function defaultTemplateFor(profileType: string): ProfileTemplateId {
  return profileType === "BUSINESS" ? "business" : "personal";
}

/** Templates a profile type may use (creation picker + service guard). */
export function compatibleTemplates(profileType: string): ProfileTemplate[] {
  return PROFILE_TEMPLATES.filter((t) => t.profileType === profileType);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Seed a profile's sections from a template. Inserts ONLY missing types
 * (existing rows — including disabled or customized ones — are never
 * touched, moved, or recreated), appending after the current max position.
 * Idempotent: rerunning inserts nothing. Returns false on failure without
 * throwing — callers fall back to the default order.
 */
export async function seedTemplateSections(
  profileId: string,
  templateId: string,
  supabase: SectionsDb,
): Promise<boolean> {
  const template = getProfileTemplate(templateId);
  if (!template || !UUID_PATTERN.test(profileId)) return false;
  try {
    const { data: existing, error: loadError } = await supabase
      .from("profile_sections")
      .select("type, position")
      .eq("profile_id", profileId);
    if (loadError) return false;
    const rows = (existing ?? []) as { type: string; position: number }[];
    const present = new Set(rows.map((r) => r.type));
    const missing = template.sections.filter((s) => !present.has(s.type));
    if (missing.length === 0) return true;
    const maxPosition = rows.reduce((max, r) => Math.max(max, r.position), 0);
    const inserts = missing.map((s, i) => ({
      profile_id: profileId,
      type: s.type,
      position: maxPosition + i + 1,
      enabled: s.enabled,
      settings: (template.settings[s.type] ?? {}) as Json,
    }));
    const { error: insertError } = await supabase.from("profile_sections").insert(inserts);
    return !insertError;
  } catch {
    return false;
  }
}
