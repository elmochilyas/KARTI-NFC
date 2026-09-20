import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSlug, normalizeSlug } from "@/domain/slugs";
import type { Database } from "@/types/database";
import { profileSchema, profileStatusSchema, type ProfileInput } from "./schema";
import { PROFILE_DETAIL_COLUMNS, type ProfileResult, type ProfileRow } from "./types";

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

function notFound(entity: string) {
  return {
    ok: false as const,
    error: { code: "NOT_FOUND" as const, message: `${entity} not found.` },
  };
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
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
    };
  }
  return { ok: true, data: data ?? null };
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
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the profile. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data };
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

  const { data, error } = await supabase
    .from("profiles")
    .insert({
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
    })
    .select(PROFILE_DETAIL_COLUMNS)
    .single();

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

  const { data, error } = await supabase
    .from("profiles")
    .update({
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
    })
    .eq("id", profileId)
    .select(PROFILE_DETAIL_COLUMNS)
    .maybeSingle();

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
  return { ok: true, data };
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

  const { data, error } = await supabase
    .from("profiles")
    .update({ status: parsed.data })
    .eq("id", profileId)
    .select(PROFILE_DETAIL_COLUMNS)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not change the status. Please try again." },
    };
  }
  if (!data) return notFound("Profile");
  return { ok: true, data };
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
