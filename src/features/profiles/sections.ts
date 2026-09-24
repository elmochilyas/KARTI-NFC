import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  DEFAULT_SECTION_ORDER,
  PROFILE_SECTION_COLUMNS,
  type ProfileResult,
  type ProfileSectionRow,
} from "./types";
import { getCatalogEntry, isFoundationSectionType, isKnownSectionType } from "./sectionCatalog";
import { sanitizeAdminSettings } from "./sectionSettings";

export type SectionsDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(supabase: SectionsDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED = {
  ok: false as const,
  error: { code: "UNAUTHORIZED" as const, message: "Sign in to manage sections." },
};

function sectionNotFound() {
  return { ok: false as const, error: { code: "NOT_FOUND" as const, message: "Section not found." } };
}

/**
 * List a profile's sections in render order. Verifies the profile belongs
 * to the route's client (URL is never trusted) — same ownership pattern as
 * listProfileLinks.
 */
export async function listProfileSections(
  profileId: string,
  clientId: string,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow[]>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return sectionNotFound();
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return sectionNotFound();
  const { data, error } = await supabase
    .from("profile_sections")
    .select(PROFILE_SECTION_COLUMNS)
    .eq("profile_id", profileId)
    .order("position", { ascending: true });
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load sections. Please try again." },
    };
  }
  return { ok: true, data: (data ?? []) as ProfileSectionRow[] };
}

/**
 * Verify the section belongs to the profile, which belongs to the client.
 * Single join query instead of serial selects; NOT_FOUND semantics unchanged.
 */
async function getOwnedSection(
  sectionId: string,
  profileId: string,
  clientId: string,
  supabase: SectionsDb,
): Promise<ProfileResult<{ section: ProfileSectionRow }>> {
  if (!UUID_PATTERN.test(sectionId) || !UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) {
    return sectionNotFound();
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: section, error: sectionError } = await supabase
    .from("profile_sections")
    .select(`${PROFILE_SECTION_COLUMNS}, profiles!inner(client_id)`)
    .eq("id", sectionId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (sectionError || !section) return sectionNotFound();
  const { profiles, ...row } = section as unknown as ProfileSectionRow & {
    profiles: { client_id: string } | null;
  };
  if (!profiles || profiles.client_id !== clientId) return sectionNotFound();
  if (!isKnownSectionType(row.type)) return sectionNotFound();
  return { ok: true, data: { section: row } };
}

/** Enable or disable a section (reversible — single tap, no confirm needed). */
export async function toggleProfileSection(
  sectionId: string,
  profileId: string,
  clientId: string,
  enabled: boolean,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow>> {
  const owned = await getOwnedSection(sectionId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  const { data, error } = await supabase
    .from("profile_sections")
    .update({ enabled })
    .eq("id", sectionId)
    .select(PROFILE_SECTION_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    if (!data && !error) return sectionNotFound();
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not update the section. Please try again." },
    };
  }
  return { ok: true, data: data as ProfileSectionRow };
}

/**
 * Persist a new section order (array of section ids, top first). Every id
 * must belong to the profile; the relationship chain is re-verified first.
 * Positions are 1-based (hero=1, actions=2, links=3 by default).
 *
 * UNIQUE(profile_id, position) safety: two-phase write. Phase 1 parks every
 * row on a distinct out-of-range offset (1000+i); phase 2 assigns final
 * 1-based positions. Parallel within each phase (no N-serial round-trips),
 * never a transient unique violation.
 */
export async function reorderProfileSections(
  profileId: string,
  clientId: string,
  orderedIds: string[],
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow[]>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return sectionNotFound();
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !UUID_PATTERN.test(id))) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid section order." },
    };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return sectionNotFound();

  const { data: existing } = await supabase
    .from("profile_sections")
    .select("id")
    .eq("profile_id", profileId);
  const existingIds = new Set((existing ?? []).map((row) => row.id));
  if (orderedIds.length !== existingIds.size || !orderedIds.every((id) => existingIds.has(id))) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Order must contain exactly the profile sections." },
    };
  }

  const park = orderedIds.map((id, i) =>
    supabase
      .from("profile_sections")
      .update({ position: 1000 + i })
      .eq("id", id as string),
  );
  const parked = await Promise.all(park);
  if (parked.some((outcome) => outcome.error)) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not save the order. Please try again." },
    };
  }
  const finalize = orderedIds.map((id, i) =>
    supabase
      .from("profile_sections")
      .update({ position: i + 1 })
      .eq("id", id as string),
  );
  const outcomes = await Promise.all(finalize);
  if (outcomes.some((outcome) => outcome.error)) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not save the order. Please try again." },
    };
  }
  const { data, error } = await supabase
    .from("profile_sections")
    .select(PROFILE_SECTION_COLUMNS)
    .eq("profile_id", profileId)
    .order("position", { ascending: true });
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load sections. Please try again." },
    };
  }
  return { ok: true, data: (data ?? []) as ProfileSectionRow[] };
}

/**
 * Add a registry section to a profile. Ownership-verified; the type must be
 * registry-known (migration CHECK) and singleton-guarded (UNIQUE).
 *
 * Architecture note (ADR-052): the service permits any registry type — the
 * dashboard Add modal gates on catalog `status === "live"`. When a planned
 * section ships (status flip + component), Add works with zero service
 * changes. The modal currently lists planned types as Coming soon, so this
 * path is service-architecture + tests until then.
 */
export async function addProfileSection(
  profileId: string,
  clientId: string,
  rawType: unknown,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return sectionNotFound();
  if (typeof rawType !== "string" || !isKnownSectionType(rawType)) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Unknown section type." },
    };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id, profile_type")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return sectionNotFound();

  const entry = getCatalogEntry(rawType);
  if (entry && !(entry.supportedProfiles as string[]).includes(profile.profile_type)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `“${entry.label}” is only available for ${entry.supportedProfiles.join(" and ").toLowerCase()} profiles.`,
      },
    };
  }

  const { data: existing } = await supabase
    .from("profile_sections")
    .select("id")
    .eq("profile_id", profileId)
    .eq("type", rawType);
  if (existing && existing.length > 0) {
    const label = getCatalogEntry(rawType)?.label ?? rawType;
    return {
      ok: false,
      error: { code: "CONFLICT", message: `“${label}” is already on this profile.` },
    };
  }

  const { data: siblings } = await supabase
    .from("profile_sections")
    .select("position")
    .eq("profile_id", profileId);
  const maxPosition = (siblings ?? []).reduce(
    (max, row) => Math.max(max, (row as { position: number }).position),
    0,
  );

  const { data, error } = await supabase
    .from("profile_sections")
    .insert({
      profile_id: profileId,
      type: rawType,
      position: maxPosition + 1,
      enabled: true,
      settings: getCatalogEntry(rawType)?.defaultSettings ?? {},
    })
    .select(PROFILE_SECTION_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    if (!data && !error) return sectionNotFound();
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not add the section. Please try again." },
    };
  }
  return { ok: true, data: data as ProfileSectionRow };
}

/**
 * Remove a section row. The foundation trio (hero/actions/links) is
 * structural and can only be hidden, never deleted. Planned-type rows may
 * be removed (e.g. undoing an experimental add). Ownership-verified.
 */
export async function deleteProfileSection(
  sectionId: string,
  profileId: string,
  clientId: string,
  supabase: SectionsDb,
): Promise<ProfileResult<{ id: string }>> {
  const owned = await getOwnedSection(sectionId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  if (isFoundationSectionType(owned.data.section.type)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Core sections can be hidden, but not removed.",
      },
    };
  }
  const { error } = await supabase.from("profile_sections").delete().eq("id", sectionId);
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not remove the section. Please try again." },
    };
  }
  return { ok: true, data: { id: sectionId } };
}

/**
 * Update a section's settings. Ownership-verified; the payload must match
 * the section type's schema (unknown keys stripped, bad values rejected).
 * Planned types accept only `{}` until they ship their schema — the
 * dashboard editor only opens for types with a settingsComponent.
 */
export async function updateSectionSettings(
  sectionId: string,
  profileId: string,
  clientId: string,
  rawSettings: unknown,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow>> {
  const owned = await getOwnedSection(sectionId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  const sanitized = sanitizeAdminSettings(owned.data.section.type, rawSettings);
  if (!sanitized.ok) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: sanitized.message },
    };
  }
  const { data, error } = await supabase
    .from("profile_sections")
    .update({ settings: sanitized.settings })
    .eq("id", sectionId)
    .select(PROFILE_SECTION_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    if (!data && !error) return sectionNotFound();
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not save settings. Please try again." },
    };
  }
  return { ok: true, data: data as ProfileSectionRow };
}

/**
 * Read one owned section row (settings included). Ownership-verified via
 * getOwnedSection — same guarantees as the mutation paths.
 */
export async function getSectionSettings(
  sectionId: string,
  profileId: string,
  clientId: string,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow>> {
  const owned = await getOwnedSection(sectionId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  return { ok: true, data: owned.data.section };
}

/**
 * Seed the foundation rows for a freshly created profile: hero(1),
 * actions(2), links(3). Caller must already hold admin verification
 * (createProfileInternal verifies before insert); RLS stays enforcement.
 * Best-effort: returns false on failure without throwing — the public
 * loader falls back to the default order, and ensureDefaultSections can
 * repair later. Never fails profile creation over sections.
 */
export async function seedDefaultSections(
  profileId: string,
  supabase: SectionsDb,
): Promise<boolean> {
  if (!UUID_PATTERN.test(profileId)) return false;
  try {
    const rows = DEFAULT_SECTION_ORDER.map((type, i) => ({
      profile_id: profileId,
      type,
      position: i + 1,
      enabled: true,
      settings: {},
    }));
    const { error } = await supabase.from("profile_sections").insert(rows);
    return !error;
  } catch {
    // Older fakes / unexpected shapes: never fail profile creation.
    return false;
  }
}

/**
 * Repair helper: insert any missing foundation types for an existing
 * profile (e.g. rows predating the migration backfill on a restored
 * backup). Missing types append after the current max position.
 * Ownership-verified; idempotent (no-op when complete).
 */
export async function ensureDefaultSections(
  profileId: string,
  clientId: string,
  supabase: SectionsDb,
): Promise<ProfileResult<ProfileSectionRow[]>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return sectionNotFound();
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return sectionNotFound();
  const { data: existing, error: loadError } = await supabase
    .from("profile_sections")
    .select(PROFILE_SECTION_COLUMNS)
    .eq("profile_id", profileId);
  if (loadError) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load sections. Please try again." },
    };
  }
  const rows = (existing ?? []) as ProfileSectionRow[];
  const present = new Set(rows.map((r) => r.type));
  const missing = DEFAULT_SECTION_ORDER.filter((t) => !present.has(t));
  if (missing.length > 0) {
    const maxPosition = rows.reduce((max, r) => Math.max(max, r.position), 0);
    const inserts = missing.map((type, i) => ({
      profile_id: profileId,
      type,
      position: maxPosition + i + 1,
      enabled: true,
      settings: {},
    }));
    const { error: insertError } = await supabase.from("profile_sections").insert(inserts);
    if (insertError) {
      return {
        ok: false,
        error: { code: "UNKNOWN", message: "Could not repair sections. Please try again." },
      };
    }
    return listProfileSections(profileId, clientId, supabase);
  }
  return {
    ok: true,
    data: [...rows].sort((a, b) => a.position - b.position),
  };
}
