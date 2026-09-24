import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSlug, normalizeSlug } from "@/domain/slugs";
import type { Database } from "@/types/database";
import { profileSchema, profileStatusSchema, type ProfileInput } from "./schema";
import {
  defaultTemplateFor,
  getProfileTemplate,
  isProfileTemplateId,
  seedTemplateSections,
  type ProfileTemplateId,
} from "./profileTemplates";
import {
  PROFILE_DETAIL_COLUMNS,
  PROFILE_DETAIL_COLUMNS_LEGACY,
  type ProfileResult,
  type ProfileRow,
} from "./types";

export type ProfileDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_SLUG_SUGGESTIONS = 20;

function toFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Partial<Record<keyof ProfileInput, string>> = {};
  const fields: (keyof ProfileInput)[] = [
    "profile_type",
    "slug",
    "display_name",
    "job_title",
    "company_name",
    "bio",
    "phone",
    "whatsapp",
    "email",
    "website",
    "address",
    "maps_url",
    "accent_color",
    "theme",
    "avatar_path",
    "cover_path",
  ];
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && fields.includes(field as keyof ProfileInput)) {
      const key = field as keyof ProfileInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function validationFailed(issues: readonly { path: PropertyKey[]; message: string }[]) {
  return {
    ok: false as const,
    error: {
      code: "VALIDATION_ERROR" as const,
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(issues),
    },
  };
}

/**
 * Every privileged operation re-verifies the session server-side.
 * Page-level protection and RLS are additional layers, not the check.
 *
 * Latency path: server actions verify once via `getClaims()` and pass
 * `{ skipAuth: true }` into the `*Internal` variants below. RLS remains
 * the enforcement layer — `skipAuth` only skips the redundant in-process
 * re-verification, never authorization itself. `skipAuth` must only be
 * set server-side by an already-verified caller.
 */
async function requireAdmin(supabase: ProfileDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

/** Pre-verified caller flag — skips the redundant `requireAdmin()` round-trip. */
export type ProfileAuthOptions = {
  skipAuth?: boolean;
};

async function ensureAdmin(supabase: ProfileDb, options?: ProfileAuthOptions): Promise<boolean> {
  if (options?.skipAuth) return true;
  return requireAdmin(supabase);
}

const UNAUTHORIZED = {
  ok: false as const,
  error: { code: "UNAUTHORIZED" as const, message: "Sign in to manage profiles." },
};

/**
 * Production regression guard (Phase 33 incident): the live database may
 * predate migrations that added columns (e.g. `profiles.template`,
 * migration 20260927). PostgREST answers unknown-column selects/writes
 * with PGRST204 (schema-cache miss). Callers use this to degrade
 * gracefully instead of failing pre-migration profiles.
 */
export function isMissingColumnError(error: unknown, column: string): boolean {
  if (error === null || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "PGRST204" || code === "42703") return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("could not find") &&
    message.toLowerCase().includes(column.toLowerCase()) &&
    message.toLowerCase().includes("column")
  );
}

/**
 * Tolerant template-column read. Returns the stored template id, or null
 * when the column is missing (pre-migration database), the row is absent,
 * or any error occurs. Never throws — the edit page treats null as
 * "template metadata unavailable" while the profile itself keeps loading.
 */
export async function getProfileTemplateColumn(
  profileId: string,
  supabase: ProfileDb,
): Promise<string | null> {
  if (!UUID_PATTERN.test(profileId)) return null;
  try {
    if (!(await requireAdmin(supabase))) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("template")
      .eq("id", profileId)
      .maybeSingle();
    if (error || !data) return null;
    const template = (data as unknown as { template?: unknown }).template;
    return typeof template === "string" ? template : null;
  } catch {
    return null;
  }
}

function notFound(entity: string) {
  return {
    ok: false as const,
    error: { code: "NOT_FOUND" as const, message: `${entity} not found.` },
  };
}

/**
 * Regression guard: normalize a fetched profile row so pre-migration
 * databases can never crash a loader or editor. `public_code` is NOT NULL
 * on migrated databases (migration 20260923 backfills + defaults every
 * row), but a database predating that migration returns rows without the
 * key at all (legacy-column retry below). Normalizing to "" keeps the
 * dashboard loading; the public `/u/` route fail-closes to 404 until the
 * migration lands, which is the safe direction. Never generates-and-
 * persists here — identity codes are minted by the DB DEFAULT generator
 * and backfilled by the migration, so a read path must not invent one.
 */
function normalizeProfileRow(row: ProfileRow | Omit<ProfileRow, "public_code">): ProfileRow {
  const publicCode = (row as { public_code?: unknown }).public_code;
  if (typeof publicCode === "string") return row as ProfileRow;
  return { ...row, public_code: "" } as ProfileRow;
}

/**
 * Whether a PostgREST error is a missing-column schema-cache miss for one
 * of the profile identity columns added after the MVP foundation
 * (`public_code` in 20260923, `template` in 20260927 — the latter is never
 * selected, checked defensively).
 */
function isMissingIdentityColumn(error: unknown): boolean {
  return isMissingColumnError(error, "public_code") || isMissingColumnError(error, "template");
}

/**
 * Resolve the effective template for a profile. Stored metadata wins when
 * it exists and fits the profile type; otherwise derive from the profile
 * type (personal for PERSON, business for BUSINESS). Guarantees old
 * profiles created before templates (Phase 30) always resolve to a valid
 * template instead of null/crash.
 */
export function resolveProfileTemplate(
  stored: unknown,
  profileType: string,
): ProfileTemplateId {
  if (
    isProfileTemplateId(stored) &&
    getProfileTemplate(stored)?.profileType === profileType
  ) {
    return stored;
  }
  return defaultTemplateFor(profileType);
}

/**
 * Auto-suggest a slug from a display/client name:
 * "Ahmed Benali" → "ahmed-benali" (falls back to "profile").
 */
export function suggestSlug(displayName: string): string {
  const normalized = normalizeSlug(displayName);
  return normalized === "" ? "profile" : normalized;
}

/** Find the first free slug: base, base-2, base-3, … (never overwrites). */
export async function ensureUniqueSlug(
  base: string,
  supabase: ProfileDb,
  excludeId?: string,
): Promise<string> {
  const clean = normalizeSlug(base) || "profile";
  for (let n = 1; n <= MAX_SLUG_SUGGESTIONS; n += 1) {
    const candidate = n === 1 ? clean : `${clean}-${n}`;
    if (isReservedSlug(candidate)) continue;
    let query = supabase.from("profiles").select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) break;
    if (!data || data.length === 0) return candidate;
  }
  return `${clean}-${Date.now().toString(36)}`;
}

export async function checkSlugAvailabilityInternal(
  rawSlug: string,
  supabase: ProfileDb,
  excludeId?: string,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<{ slug: string; available: boolean; suggestion: string | null }>> {
  const slug = normalizeSlug(rawSlug);
  if (slug === "" || isReservedSlug(slug)) {
    return { ok: true, data: { slug, available: false, suggestion: null } };
  }
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;
  let query = supabase.from("profiles").select("id").eq("slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not check the slug. Please try again." },
    };
  }
  const available = !data || data.length === 0;
  return {
    ok: true,
    data: {
      slug,
      available,
      suggestion: available ? null : await ensureUniqueSlug(slug, supabase, excludeId),
    },
  };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function checkSlugAvailability(
  rawSlug: string,
  supabase: ProfileDb,
  excludeId?: string,
): Promise<ProfileResult<{ slug: string; available: boolean; suggestion: string | null }>> {
  return checkSlugAvailabilityInternal(rawSlug, supabase, excludeId);
}

export async function getProfileByClientIdInternal(
  clientId: string,
  supabase: ProfileDb,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow | null>> {
  if (!UUID_PATTERN.test(clientId)) return notFound("Client");
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_DETAIL_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Pre-migration database (missing `public_code` column): retry with the
    // legacy projection so existing profiles keep loading. Any other error
    // still surfaces as a load failure.
    if (isMissingIdentityColumn(error)) {
      const retry = await supabase
        .from("profiles")
        .select(PROFILE_DETAIL_COLUMNS_LEGACY)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (retry.error) {
        return {
          ok: false,
          error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
        };
      }
      return { ok: true, data: retry.data ? normalizeProfileRow(retry.data) : null };
    }
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
    };
  }
  return { ok: true, data: data ? normalizeProfileRow(data) : null };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function getProfileByClientId(
  clientId: string,
  supabase: ProfileDb,
): Promise<ProfileResult<ProfileRow | null>> {
  return getProfileByClientIdInternal(clientId, supabase);
}

export async function getProfileByIdInternal(
  profileId: string,
  supabase: ProfileDb,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow>> {
  if (!UUID_PATTERN.test(profileId)) return notFound("Profile");
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_DETAIL_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    // Same pre-migration fallback as getProfileByClientIdInternal.
    if (isMissingIdentityColumn(error)) {
      const retry = await supabase
        .from("profiles")
        .select(PROFILE_DETAIL_COLUMNS_LEGACY)
        .eq("id", profileId)
        .maybeSingle();
      if (retry.error) {
        return {
          ok: false,
          error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
        };
      }
      if (!retry.data) return notFound("Profile");
      return { ok: true, data: normalizeProfileRow(retry.data) };
    }
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data: normalizeProfileRow(data) };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function getProfileById(
  profileId: string,
  supabase: ProfileDb,
): Promise<ProfileResult<ProfileRow>> {
  return getProfileByIdInternal(profileId, supabase);
}

export async function createProfileInternal(
  clientId: string,
  rawInput: unknown,
  supabase: ProfileDb,
  explicitId?: string,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow>> {
  if (!UUID_PATTERN.test(clientId)) return notFound("Client");
  const parsed = profileSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;

  // MVP: one primary profile per client (enforced here, not by DB constraint).
  const existing = await getProfileByClientIdInternal(clientId, supabase, options);
  if (!existing.ok) return existing;
  if (existing.data) {
    return {
      ok: false,
      error: { code: "CONFLICT", message: "This client already has a profile. Edit it instead." },
    };
  }

  const availability = await checkSlugAvailabilityInternal(
    parsed.data.slug,
    supabase,
    undefined,
    options,
  );
  if (!availability.ok) return availability;
  if (!availability.data.available) {
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: availability.data.suggestion
          ? `This slug is taken. Try “${availability.data.suggestion}”.`
          : "This slug is taken.",
        fieldErrors: { slug: "This slug is taken." },
      },
    };
  }

  // Template: explicit choice wins when it exists and matches the profile
  // type; otherwise the type default applies. Unknown ids never fail creation.
  const requestedTemplate =
    typeof rawInput === "object" && rawInput !== null
      ? (rawInput as Record<string, unknown>).template
      : undefined;
  let template: ProfileTemplateId = defaultTemplateFor(parsed.data.profile_type);
  if (
    isProfileTemplateId(requestedTemplate) &&
    getProfileTemplate(requestedTemplate)?.profileType === parsed.data.profile_type
  ) {
    template = requestedTemplate;
  }

  const baseRow = {
    ...(explicitId && UUID_PATTERN.test(explicitId) ? { id: explicitId } : {}),
    client_id: clientId,
    profile_type: parsed.data.profile_type,
    slug: availability.data.slug,
    display_name: parsed.data.display_name,
    job_title: parsed.data.job_title,
    company_name: parsed.data.company_name,
    bio: parsed.data.bio,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    website: parsed.data.website,
    address: parsed.data.address,
    maps_url: parsed.data.maps_url,
    accent_color: parsed.data.accent_color,
    theme: parsed.data.theme,
    avatar_path: parsed.data.avatar_path,
    cover_path: parsed.data.cover_path,
    status: "DRAFT",
  };

  async function insertProfile(row: Database["public"]["Tables"]["profiles"]["Insert"]) {
    return supabase.from("profiles").insert(row).select(PROFILE_DETAIL_COLUMNS).single();
  }

  async function insertProfileLegacy(row: Database["public"]["Tables"]["profiles"]["Insert"]) {
    return supabase.from("profiles").insert(row).select(PROFILE_DETAIL_COLUMNS_LEGACY).single();
  }

  let { data, error } = await insertProfile({ ...baseRow, template });
  if (error && isMissingColumnError(error, "template")) {
    // Pre-migration database (Phase 33 incident): the template column does
    // not exist yet. Retry without it — the profile must still be created;
    // template metadata can be set after the migration lands.
    ({ data, error } = await insertProfile(baseRow));
  }
  if (error && isMissingIdentityColumn(error)) {
    // Pre-`public_code` database: the statement fails on the returning
    // projection (schema-cache miss), so nothing committed — retry the
    // insert with the legacy projection. New rows on migrated databases
    // always receive a DB-generated code; legacy rows normalize to "".
    const legacy = await insertProfileLegacy(baseRow);
    error = legacy.error;
    data = legacy.data ? normalizeProfileRow(legacy.data) : null;
  }
  if (data) data = normalizeProfileRow(data);

  if (error || !data) {
    if (error?.code === "23505") {
      // The one-profile-per-client UNIQUE constraint (not the slug) fired —
      // a concurrent create won the race the app-level check could not see.
      if (error.message.includes("profiles_client_id_unique")) {
        return {
          ok: false,
          error: {
            code: "CONFLICT",
            message: "This client already has a profile. Edit it instead.",
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "This slug was just taken. Try another.",
          fieldErrors: { slug: "This slug is taken." },
        },
      };
    }
    if (error?.code === "23503") return notFound("Client");
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not create the profile. Please try again." },
    };
  }
  // Template sections for the new profile (trio included in every template).
  // Best-effort: the public loader falls back to the default order when
  // rows are absent, so a seed failure never fails profile creation.
  await seedTemplateSections(data.id, template, supabase);
  return { ok: true, data };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function createProfile(
  clientId: string,
  rawInput: unknown,
  supabase: ProfileDb,
  explicitId?: string,
): Promise<ProfileResult<ProfileRow>> {
  return createProfileInternal(clientId, rawInput, supabase, explicitId);
}

export async function updateProfileInternal(
  profileId: string,
  clientId: string,
  rawInput: unknown,
  supabase: ProfileDb,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) {
    return notFound("Profile");
  }
  const parsed = profileSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;

  // Never trust the URL: the row must belong to the route's client.
  const current = await getProfileByIdInternal(profileId, supabase, options);
  if (!current.ok) return current;
  if (current.data.client_id !== clientId) return notFound("Profile");

  // Slug fast path: when unchanged, skip the availability query entirely.
  if (parsed.data.slug !== current.data.slug) {
    const availability = await checkSlugAvailabilityInternal(
      parsed.data.slug,
      supabase,
      profileId,
      options,
    );
    if (!availability.ok) return availability;
    if (!availability.data.available) {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: availability.data.suggestion
            ? `This slug is taken. Try “${availability.data.suggestion}”.`
            : "This slug is taken.",
          fieldErrors: { slug: "This slug is taken." },
        },
      };
    }
  }

  const updatePatch = {
    profile_type: parsed.data.profile_type,
    slug: parsed.data.slug,
    display_name: parsed.data.display_name,
    job_title: parsed.data.job_title,
    company_name: parsed.data.company_name,
    bio: parsed.data.bio,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    website: parsed.data.website,
    address: parsed.data.address,
    maps_url: parsed.data.maps_url,
    accent_color: parsed.data.accent_color,
    theme: parsed.data.theme,
    avatar_path: parsed.data.avatar_path,
    cover_path: parsed.data.cover_path,
  };
  let { data, error } = await supabase
    .from("profiles")
    .update(updatePatch)
    .eq("id", profileId)
    .select(PROFILE_DETAIL_COLUMNS)
    .maybeSingle();

  if (error && isMissingIdentityColumn(error)) {
    // Pre-migration database: the update committed (patch touches no new
    // column); only the returning projection failed. Re-read with the
    // legacy projection instead of failing the save.
    const reread = await supabase
      .from("profiles")
      .select(PROFILE_DETAIL_COLUMNS_LEGACY)
      .eq("id", profileId)
      .maybeSingle();
    error = reread.error;
    data = reread.data ? normalizeProfileRow(reread.data) : null;
  }

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "This slug was just taken. Try another.",
          fieldErrors: { slug: "This slug is taken." },
        },
      };
    }
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not update the profile. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data: normalizeProfileRow(data) };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function updateProfile(
  profileId: string,
  clientId: string,
  rawInput: unknown,
  supabase: ProfileDb,
): Promise<ProfileResult<ProfileRow>> {
  return updateProfileInternal(profileId, clientId, rawInput, supabase);
}

export async function setProfileStatusInternal(
  profileId: string,
  clientId: string,
  rawStatus: unknown,
  supabase: ProfileDb,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) {
    return notFound("Profile");
  }
  const parsed = profileStatusSchema.safeParse(rawStatus);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid status." },
    };
  }
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;

  const current = await getProfileByIdInternal(profileId, supabase, options);
  if (!current.ok) return current;
  if (current.data.client_id !== clientId) return notFound("Profile");

  // Activation minimum: a name and a usable slug. Nothing else is required —
  // a profile with just name + phone + Instagram must be activatable.
  if (parsed.data === "ACTIVE") {
    if (!current.data.display_name.trim() || !normalizeSlug(current.data.slug)) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Add a display name and a valid slug before activating.",
        },
      };
    }
  }

  let { data, error } = await supabase
    .from("profiles")
    .update({ status: parsed.data })
    .eq("id", profileId)
    .select(PROFILE_DETAIL_COLUMNS)
    .maybeSingle();

  if (error && isMissingIdentityColumn(error)) {
    // Same pre-migration case as updateProfile: status committed, only the
    // returning projection failed. Re-read legacy instead of failing.
    const reread = await supabase
      .from("profiles")
      .select(PROFILE_DETAIL_COLUMNS_LEGACY)
      .eq("id", profileId)
      .maybeSingle();
    error = reread.error;
    data = reread.data ? normalizeProfileRow(reread.data) : null;
  }

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not change the status. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data: normalizeProfileRow(data) };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function setProfileStatus(
  profileId: string,
  clientId: string,
  rawStatus: unknown,
  supabase: ProfileDb,
): Promise<ProfileResult<ProfileRow>> {
  return setProfileStatusInternal(profileId, clientId, rawStatus, supabase);
}

/**
 * Change a profile's template metadata. Updates ONLY the `template` column —
 * existing sections are never created, modified, moved, or deleted here
 * (structural guarantee: this function issues no `profile_sections`
 * query at all). The template takes effect for reference only.
 */
export async function updateProfileTemplateInternal(
  profileId: string,
  clientId: string,
  rawTemplate: unknown,
  supabase: ProfileDb,
  options?: ProfileAuthOptions,
): Promise<ProfileResult<ProfileRow>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) {
    return notFound("Profile");
  }
  if (!isProfileTemplateId(rawTemplate)) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Unknown template." },
    };
  }
  if (!(await ensureAdmin(supabase, options))) return UNAUTHORIZED;

  const current = await getProfileByIdInternal(profileId, supabase, options);
  if (!current.ok) return current;
  if (current.data.client_id !== clientId) return notFound("Profile");
  if (getProfileTemplate(rawTemplate)?.profileType !== current.data.profile_type) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "That template does not fit this profile type." },
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ template: rawTemplate })
    .eq("id", profileId)
    .select(PROFILE_DETAIL_COLUMNS)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, "template")) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN",
          message: "Template switching is unavailable until migration 20260927 is applied.",
        },
      };
    }
    if (isMissingIdentityColumn(error)) {
      // Template committed on a DB whose returning projection still lacks
      // `public_code`: re-read legacy so the switch does not look failed.
      const reread = await getProfileByIdInternal(profileId, supabase, options);
      if (!reread.ok) {
        return {
          ok: false,
          error: { code: "UNKNOWN", message: "Could not change the template. Please try again." },
        };
      }
      if (!reread.data) return notFound("Profile");
      return { ok: true, data: reread.data };
    }
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not change the template. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data: normalizeProfileRow(data) };
}

/** Public wrapper — same signature as before (verifies admin per call). */
export async function updateProfileTemplate(
  profileId: string,
  clientId: string,
  rawTemplate: unknown,
  supabase: ProfileDb,
): Promise<ProfileResult<ProfileRow>> {
  return updateProfileTemplateInternal(profileId, clientId, rawTemplate, supabase);
}
