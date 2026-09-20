import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { validateSafeExternalUrl } from "@/domain/urls";
import type { Database } from "@/types/database";
import {
  LINK_TYPES,
  PROFILE_LINK_COLUMNS,
  type ProfileErrorCode,
  type ProfileLinkRow,
  type ProfileResult,
} from "./types";

export type LinksDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LABEL = 80;

export const linkSchema = z.object({
  type: z.enum(LINK_TYPES, { message: "Choose a link type." }),
  label: z
    .string()
    .trim()
    .min(1, "Label is required.")
    .max(MAX_LABEL, `Label must be ${MAX_LABEL} characters or fewer.`),
  url: z
    .string()
    .trim()
    .min(1, "URL is required.")
    .refine((v) => validateSafeExternalUrl(v) !== null, {
      message: "Enter a valid http(s) URL.",
    })
    .transform((v) => validateSafeExternalUrl(v) as string),
  icon: z
    .string()
    .trim()
    .max(40, "Icon must be 40 characters or fewer.")
    .transform((v) => (v === "" ? null : v)),
});

export type LinkInput = z.infer<typeof linkSchema>;
export type LinkFieldErrors = Partial<Record<"type" | "label" | "url" | "icon", string>>;

export type LinkResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ProfileErrorCode; message: string; fieldErrors?: LinkFieldErrors };
    };

function linkValidationFailed(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: LinkFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "type" || field === "label" || field === "url" || field === "icon") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return {
    ok: false as const,
    error: { code: "VALIDATION_ERROR" as const, message: "Check the link fields.", fieldErrors },
  };
}

async function requireAdmin(supabase: LinksDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED = {
  ok: false as const,
  error: { code: "UNAUTHORIZED" as const, message: "Sign in to manage links." },
};

function linkNotFound() {
  return { ok: false as const, error: { code: "NOT_FOUND" as const, message: "Link not found." } };
}

/**
 * Verify the link belongs to the profile, which belongs to the client.
 * Single join query (profile_links + profiles!inner) instead of two
 * serial selects; NOT_FOUND semantics are unchanged.
 */
async function getOwnedLink(
  linkId: string,
  profileId: string,
  clientId: string,
  supabase: LinksDb,
): Promise<ProfileResult<{ link: ProfileLinkRow }>> {
  if (!UUID_PATTERN.test(linkId) || !UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) {
    return linkNotFound();
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: link, error: linkError } = await supabase
    .from("profile_links")
    .select(`${PROFILE_LINK_COLUMNS}, profiles!inner(client_id)`)
    .eq("id", linkId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (linkError || !link) return linkNotFound();
  const { profiles, ...row } = link as unknown as ProfileLinkRow & {
    profiles: { client_id: string } | null;
  };
  if (!profiles || profiles.client_id !== clientId) return linkNotFound();
  return { ok: true, data: { link: row } };
}

export async function listProfileLinks(
  profileId: string,
  clientId: string,
  supabase: LinksDb,
): Promise<ProfileResult<ProfileLinkRow[]>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return linkNotFound();
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return linkNotFound();
  const { data, error } = await supabase
    .from("profile_links")
    .select(PROFILE_LINK_COLUMNS)
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load links. Please try again." },
    };
  }
  return { ok: true, data: data ?? [] };
}

export async function createProfileLink(
  profileId: string,
  clientId: string,
  rawInput: unknown,
  supabase: LinksDb,
): Promise<LinkResult<ProfileLinkRow>> {
  const parsed = linkSchema.safeParse(rawInput);
  if (!parsed.success) return linkValidationFailed(parsed.error.issues);
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return linkNotFound();
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  // Ownership check and current-max sort_order are independent — one batch.
  const [profileRes, maxRes] = await Promise.all([
    supabase.from("profiles").select("id, client_id").eq("id", profileId).maybeSingle(),
    supabase
      .from("profile_links")
      .select("sort_order")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const profile = profileRes.data;
  if (!profile || profile.client_id !== clientId) return linkNotFound();
  const sortOrder = (maxRes.data?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("profile_links")
    .insert({
      profile_id: profileId,
      type: parsed.data.type,
      label: parsed.data.label,
      url: parsed.data.url,
      icon: parsed.data.icon,
      sort_order: sortOrder,
      enabled: true,
    })
    .select(PROFILE_LINK_COLUMNS)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not add the link. Please try again." },
    };
  }
  return { ok: true, data };
}

export async function updateProfileLink(
  linkId: string,
  profileId: string,
  clientId: string,
  rawInput: unknown,
  supabase: LinksDb,
): Promise<LinkResult<ProfileLinkRow>> {
  const parsed = linkSchema.safeParse(rawInput);
  if (!parsed.success) return linkValidationFailed(parsed.error.issues);
  const owned = await getOwnedLink(linkId, profileId, clientId, supabase);
  if (!owned.ok)
    return { ok: false as const, error: { code: owned.error.code, message: owned.error.message } };

  const { data, error } = await supabase
    .from("profile_links")
    .update({
      type: parsed.data.type,
      label: parsed.data.label,
      url: parsed.data.url,
      icon: parsed.data.icon,
    })
    .eq("id", linkId)
    .select(PROFILE_LINK_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    if (!data && !error) return linkNotFound();
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not update the link. Please try again." },
    };
  }
  return { ok: true, data };
}

export async function deleteProfileLink(
  linkId: string,
  profileId: string,
  clientId: string,
  supabase: LinksDb,
): Promise<ProfileResult<{ id: string }>> {
  const owned = await getOwnedLink(linkId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  const { error } = await supabase.from("profile_links").delete().eq("id", linkId);
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not delete the link. Please try again." },
    };
  }
  return { ok: true, data: { id: linkId } };
}

export async function toggleProfileLink(
  linkId: string,
  profileId: string,
  clientId: string,
  enabled: boolean,
  supabase: LinksDb,
): Promise<ProfileResult<ProfileLinkRow>> {
  const owned = await getOwnedLink(linkId, profileId, clientId, supabase);
  if (!owned.ok) return owned;
  const { data, error } = await supabase
    .from("profile_links")
    .update({ enabled })
    .eq("id", linkId)
    .select(PROFILE_LINK_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    if (!data && !error) return linkNotFound();
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not update the link. Please try again." },
    };
  }
  return { ok: true, data };
}

/**
 * Persist a new link order (array of link ids, top first). Every id must
 * belong to the profile; the relationship chain is re-verified first.
 */
export async function reorderProfileLinks(
  profileId: string,
  clientId: string,
  orderedIds: string[],
  supabase: LinksDb,
): Promise<ProfileResult<ProfileLinkRow[]>> {
  if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(clientId)) return linkNotFound();
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !UUID_PATTERN.test(id))) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid link order." },
    };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.client_id !== clientId) return linkNotFound();

  const { data: existing } = await supabase
    .from("profile_links")
    .select("id")
    .eq("profile_id", profileId);
  const existingIds = new Set((existing ?? []).map((row) => row.id));
  if (orderedIds.length !== existingIds.size || !orderedIds.every((id) => existingIds.has(id))) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Order must contain exactly the profile links." },
    };
  }

  // Minimal safe batch: one parallel write wave instead of N serial
  // round-trips. (A single upsert would also work given the exact-set
  // check above, but partial-row upserts risk NOT NULL violations, so the
  // parallel update batch is the safer shape.)
  const writes = orderedIds.map((id, i) =>
    supabase
      .from("profile_links")
      .update({ sort_order: i })
      .eq("id", id as string),
  );
  const outcomes = await Promise.all(writes);
  if (outcomes.some((outcome) => outcome.error)) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not save the order. Please try again." },
    };
  }
  // Profile ownership was already verified above; read the new order
  // directly instead of re-running auth + ownership checks.
  const { data, error } = await supabase
    .from("profile_links")
    .select(PROFILE_LINK_COLUMNS)
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load links. Please try again." },
    };
  }
  return { ok: true, data: data ?? [] };
}
