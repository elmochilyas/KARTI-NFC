"use server";

import { lookup } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePublicProfiles } from "@/features/profiles/publicCache";
import {
  mapDraftOrder,
  planLinksDiff,
  planSectionsDiff,
  unifiedSavePayloadSchema,
  type UnifiedSavePayload,
} from "@/features/profiles/unifiedSavePlan";
import {
  createProfileInternal,
  setProfileStatusInternal,
  updateProfileInternal,
  updateProfileTemplateInternal,
} from "@/features/profiles/service";
import {
  createProfileLink,
  deleteProfileLink,
  listProfileLinks,
  reorderProfileLinks,
  toggleProfileLink,
  updateProfileLink,
} from "@/features/profiles/links";
import {
  addProfileSection,
  deleteProfileSection,
  ensureDefaultSections,
  getSectionSettings,
  listProfileSections,
  reorderProfileSections,
  toggleProfileSection,
  updateSectionSettings,
} from "@/features/profiles/sections";
import { MAPS_DETECT_FAILURE_MESSAGE, resolveMapLink } from "@/features/profiles/mapLinks";
import { FIELD_STEPS } from "@/features/profiles/unifiedDraft";
import type { ProfileLinkRow, ProfileSectionRow } from "@/features/profiles/types";
import {
  isManagedDocumentPath,
  isManagedSectionImagePath,
  publicAssetUrl,
  removeAsset,
  uploadAsset,
  uploadDocument,
  uploadSectionImage,
} from "@/features/profiles/storage";
import type { ProfileResult, ProfileRow } from "@/features/profiles/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = ProfileResult<ProfileRow> & {
  values?: Record<string, string>;
};

export type LinkFormState =
  { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type StatusFormState = { ok: boolean; message: string };

function dashboardPath(clientId: string, suffix = ""): string {
  return `/dashboard/clients/${clientId}/profile${suffix}`;
}

/**
 * Verified server client. Callers that already need admin (save/status)
 * pass `{ requireAuth: true }` to verify the session once via
 * `getClaims()`; service `*Internal` variants are then called with
 * `{ skipAuth: true }` so the save path pays for auth exactly once.
 * RLS remains the enforcement layer. Other actions call without options
 * (unchanged behavior) and rely on per-service verification.
 */
async function getServerClient(options?: { requireAuth?: boolean }) {
  try {
    const supabase = await createClient();
    if (options?.requireAuth) {
      try {
        const { data } = await supabase.auth.getClaims();
        if (!data?.claims) return null;
      } catch {
        return null;
      }
    }
    return supabase;
  } catch {
    return null;
  }
}

function readProfileForm(formData: FormData): Record<string, string> {
  const fields = [
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
    "template",
  ];
  const values: Record<string, string> = {};
  for (const field of fields) values[field] = String(formData.get(field) ?? "");
  return values;
}

/** Create or update a profile; on asset replace, the old object is removed after the row update. */
export async function saveProfileAction(
  clientId: string,
  profileId: string | null,
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = readProfileForm(formData);
  // Single admin verification for the whole save (service internals skip re-checks).
  const supabase = await getServerClient({ requireAuth: true });
  if (!supabase) {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error: { code: "UNKNOWN", message: "Profile management is not configured yet." },
        values,
      };
    }
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sign in to manage profiles." },
      values,
    };
  }

  const previousAvatar = String(formData.get("previous_avatar_path") ?? "");
  const previousCover = String(formData.get("previous_cover_path") ?? "");

  const result = profileId
    ? await updateProfileInternal(profileId, clientId, values, supabase, { skipAuth: true })
    : await createProfileInternal(
        clientId,
        values,
        supabase,
        String(formData.get("new_profile_id") ?? "") || undefined,
        { skipAuth: true },
      );

  if (!result.ok) return { ...result, values };

  // Safe replacement order: new object is stored + referenced before the old one goes.
  // Best-effort post-response cleanup via `after()` (Next 16 supports it):
  // stale deletes run in parallel and never fail the save.
  const stalePaths: string[] = [];
  if (previousAvatar !== "" && previousAvatar !== (result.data.avatar_path ?? "")) {
    stalePaths.push(previousAvatar);
  }
  if (previousCover !== "" && previousCover !== (result.data.cover_path ?? "")) {
    stalePaths.push(previousCover);
  }
  if (stalePaths.length > 0) {
    const cleanup = () =>
      Promise.all(stalePaths.map((path) => removeAsset(path, supabase)))
        .then((outcomes) => {
          for (const outcome of outcomes) {
            if (!outcome.ok) {
              console.error(
                "[saveProfileAction] best-effort asset cleanup failed:",
                outcome.message,
              );
            }
          }
        })
        .catch((error) => {
          console.error("[saveProfileAction] best-effort asset cleanup failed:", error);
        });
    try {
      after(() => cleanup());
    } catch {
      // Fallback when `after()` is unavailable: parallel deletes, logged not thrown.
      await cleanup();
    }
  }

  if (!profileId) {
    redirect(`${dashboardPath(clientId)}?created=1`);
  }
  revalidatePath(dashboardPath(clientId));
  // Zero-stale public cache: repeat taps refetch exactly once after this save.
  revalidatePublicProfiles();
  return { ok: true, data: result.data };
}

export async function setStatusAction(
  clientId: string,
  profileId: string,
  status: string,
): Promise<StatusFormState> {
  const supabase = await getServerClient({ requireAuth: true });
  if (!supabase) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: "Profile management is not configured yet." };
    }
    return { ok: false, message: "Sign in to manage profiles." };
  }
  const result = await setProfileStatusInternal(profileId, clientId, status, supabase, {
    skipAuth: true,
  });
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return {
    ok: true,
    message:
      status === "ACTIVE" ? "Profile is live." : "Profile set to " + status.toLowerCase() + ".",
  };
}

/** Void wrappers for server-component form actions (detail page buttons). */
export async function activateProfile(clientId: string, profileId: string): Promise<void> {
  await setStatusAction(clientId, profileId, "ACTIVE");
}

/**
 * Change template metadata only. Existing sections are never touched —
 * the service issues no profile_sections query for this operation.
 */
export async function updateTemplateAction(
  clientId: string,
  profileId: string,
  template: string,
): Promise<StatusFormState> {
  const supabase = await getServerClient({ requireAuth: true });
  if (!supabase) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: "Profile management is not configured yet." };
    }
    return { ok: false, message: "Sign in to manage profiles." };
  }
  const result = await updateProfileTemplateInternal(profileId, clientId, template, supabase, {
    skipAuth: true,
  });
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true, message: "Template updated. Existing sections are unchanged." };
}

export async function deactivateProfile(clientId: string, profileId: string): Promise<void> {
  await setStatusAction(clientId, profileId, "INACTIVE");
}

function readLinkForm(formData: FormData) {
  return {
    type: String(formData.get("type") ?? ""),
    label: String(formData.get("label") ?? ""),
    url: String(formData.get("url") ?? ""),
    icon: "",
  };
}

export async function addLinkAction(
  clientId: string,
  profileId: string,
  _prevState: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await createProfileLink(profileId, clientId, readLinkForm(formData), supabase);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message,
      fieldErrors:
        result.error.code === "VALIDATION_ERROR"
          ? (result.error.fieldErrors as Record<string, string> | undefined)
          : undefined,
    };
  }
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function updateLinkAction(
  clientId: string,
  profileId: string,
  linkId: string,
  _prevState: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await updateProfileLink(
    linkId,
    profileId,
    clientId,
    readLinkForm(formData),
    supabase,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message,
      fieldErrors:
        result.error.code === "VALIDATION_ERROR"
          ? (result.error.fieldErrors as Record<string, string> | undefined)
          : undefined,
    };
  }
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function deleteLinkAction(
  clientId: string,
  profileId: string,
  linkId: string,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await deleteProfileLink(linkId, profileId, clientId, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function toggleLinkAction(
  clientId: string,
  profileId: string,
  linkId: string,
  enabled: boolean,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await toggleProfileLink(linkId, profileId, clientId, enabled, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function reorderLinksAction(
  clientId: string,
  profileId: string,
  orderedIds: string[],
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await reorderProfileLinks(profileId, clientId, orderedIds, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function toggleSectionAction(
  clientId: string,
  profileId: string,
  sectionId: string,
  enabled: boolean,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await toggleProfileSection(sectionId, profileId, clientId, enabled, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function reorderSectionsAction(
  clientId: string,
  profileId: string,
  orderedIds: string[],
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await reorderProfileSections(profileId, clientId, orderedIds, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

/**
 * Repair helper for pre-backfill profiles (Phase 33 incident): inserts any
 * missing foundation sections without touching existing rows. Safe to call
 * repeatedly — a complete set is a no-op.
 */
export async function ensureSectionsAction(
  clientId: string,
  profileId: string,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await ensureDefaultSections(profileId, clientId, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function addSectionAction(
  clientId: string,
  profileId: string,
  type: string,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await addProfileSection(profileId, clientId, type, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function deleteSectionAction(
  clientId: string,
  profileId: string,
  sectionId: string,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await deleteProfileSection(sectionId, profileId, clientId, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

export async function updateSectionSettingsAction(
  clientId: string,
  profileId: string,
  sectionId: string,
  settings: unknown,
): Promise<LinkFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const previous = await getSectionSettings(sectionId, profileId, clientId, supabase);
  const result = await updateSectionSettings(sectionId, profileId, clientId, settings, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  // Best-effort orphan cleanup: section images dropped from the new settings
  // are removed so replaced item photos don't accumulate. Generic over any
  // settings shape; never fails the save.
  if (previous.ok) {
    try {
      const { isManagedDocumentPath, isManagedSectionImagePath, removeAsset } =
        await import("@/features/profiles/storage");
      const collect = (value: unknown, out: Set<string>): void => {
        if (typeof value === "string") {
          if (isManagedSectionImagePath(value) || isManagedDocumentPath(value)) out.add(value);
        } else if (Array.isArray(value)) {
          for (const v of value) collect(v, out);
        } else if (value !== null && typeof value === "object") {
          for (const v of Object.values(value)) collect(v, out);
        }
      };
      const before = new Set<string>();
      const after = new Set<string>();
      collect((previous.data as unknown as { settings?: unknown }).settings ?? null, before);
      collect((result.data as unknown as { settings?: unknown }).settings ?? null, after);
      const orphaned = [...before].filter((path) => !after.has(path));
      if (orphaned.length > 0) {
        await Promise.all(orphaned.map((path) => removeAsset(path, supabase)));
      }
    } catch {
      // Best-effort only.
    }
  }
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Unified draft save (Phase 34): ONE persist path for the whole editor */
/* ------------------------------------------------------------------ */

export type UnifiedSaveResult =
  | {
      ok: true;
      profile: ProfileRow;
      links: ProfileLinkRow[];
      sections: ProfileSectionRow[];
      created: boolean;
    }
  | {
      ok: false;
      message: string;
      step?: number;
      fieldErrors?: Record<string, string>;
      /**
       * Phase 34.2: failing section id (draft temp id for not-yet-saved
       * rows) so the Sections step can expand, scroll to, and annotate the
       * offending card instead of showing only a generic banner.
       */
      sectionId?: string;
    };

/**
 * Display labels for section types in save error messages. A local copy
 * (not the registry) so this server-action module never imports the
 * catalog's client-side editor components.
 */
const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  actions: "Quick actions & info",
  links: "Links",
  location: "Location",
  opening_hours: "Opening Hours",
  menu: "Menu",
  catalog: "Catalog",
  about: "About",
  experience: "Experience",
  cv: "CV",
  gallery: "Gallery",
};

function firstErrorStep(fieldErrors: Record<string, string> | undefined): number {
  if (!fieldErrors) return 0;
  const steps = Object.keys(fieldErrors).map((key) => FIELD_STEPS[key] ?? 0);
  return steps.length > 0 ? Math.min(...steps) : 0;
}

/** Best-effort post-response removal of replaced identity assets (never fails the save). */
function cleanupStaleIdentityAssets(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerClient>>>,
  previousAvatar: string,
  previousCover: string,
  nextAvatar: string | null,
  nextCover: string | null,
) {
  const stalePaths: string[] = [];
  if (previousAvatar !== "" && previousAvatar !== (nextAvatar ?? "")) {
    stalePaths.push(previousAvatar);
  }
  if (previousCover !== "" && previousCover !== (nextCover ?? "")) {
    stalePaths.push(previousCover);
  }
  if (stalePaths.length === 0) return;
  const cleanup = () =>
    Promise.all(stalePaths.map((path) => removeAsset(path, supabase)))
      .then((outcomes) => {
        for (const outcome of outcomes) {
          if (!outcome.ok) {
            console.error(
              "[saveUnifiedDraftAction] best-effort asset cleanup failed:",
              outcome.message,
            );
          }
        }
      })
      .catch((error) => {
        console.error("[saveUnifiedDraftAction] best-effort asset cleanup failed:", error);
      });
  try {
    after(() => cleanup());
  } catch {
    void cleanup();
  }
}

type DraftApplyError = { ok: false; message: string; sectionId?: string };

async function applyLinksDraft(
  profileId: string,
  clientId: string,
  payload: UnifiedSavePayload,
  supabase: NonNullable<Awaited<ReturnType<typeof getServerClient>>>,
): Promise<{ ok: true; tempToReal: Map<string, string> } | DraftApplyError> {
  const current = await listProfileLinks(profileId, clientId, supabase);
  if (!current.ok) return { ok: false, message: current.error.message };
  const planned = planLinksDiff(current.data, payload.links, payload.deletedLinkIds);
  if (!planned.ok) return { ok: false, message: planned.message };
  const { plan } = planned;
  for (const id of plan.deletes) {
    const result = await deleteProfileLink(id, profileId, clientId, supabase);
    if (!result.ok) return { ok: false, message: result.error.message };
  }

  const tempToReal = new Map<string, string>();
  for (const link of plan.creates) {
    const result = await createProfileLink(
      profileId,
      clientId,
      { type: link.type, label: link.label, url: link.url, icon: "" },
      supabase,
    );
    if (!result.ok) {
      const label = link.label.trim() === "" ? "a new link" : `“${link.label.trim()}”`;
      return {
        ok: false,
        message:
          result.error.code === "VALIDATION_ERROR"
            ? `Link ${label} is invalid: ${result.error.message}`
            : result.error.message,
      };
    }
    // A freshly added link saves disabled when the draft says so.
    if (!link.enabled) {
      const toggled = await toggleProfileLink(result.data.id, profileId, clientId, false, supabase);
      if (!toggled.ok) return { ok: false, message: toggled.error.message };
    }
    tempToReal.set(link.tempId, result.data.id);
  }

  for (const link of plan.updates) {
    const result = await updateProfileLink(
      link.id,
      profileId,
      clientId,
      { type: link.type, label: link.label, url: link.url, icon: "" },
      supabase,
    );
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.error.code === "VALIDATION_ERROR"
            ? `Link “${link.label.trim() || link.type}” is invalid: ${result.error.message}`
            : result.error.message,
      };
    }
  }

  for (const link of plan.toggles) {
    const result = await toggleProfileLink(link.id, profileId, clientId, link.enabled, supabase);
    if (!result.ok) return { ok: false, message: result.error.message };
  }

  const finalOrder = mapDraftOrder(plan.order, tempToReal);
  if (finalOrder === null) {
    return { ok: false, message: "Could not save the link order. Please try again." };
  }
  const remaining = current.data.map((l) => l.id).filter((id) => !plan.deletes.includes(id));
  const createdIds = plan.creates
    .map((c) => tempToReal.get(c.tempId))
    .filter((id) => id !== undefined);
  const expectedCurrent = [...remaining, ...createdIds];
  if (finalOrder.join() !== expectedCurrent.join()) {
    const result = await reorderProfileLinks(profileId, clientId, finalOrder, supabase);
    if (!result.ok) return { ok: false, message: result.error.message };
  }
  return { ok: true, tempToReal };
}

/**
 * Phase 34.1: remap draft-temp link refs (`link:draft-…`, promoted before
 * their first save) to real ids after link creation. Unmapped temps (link
 * deleted before saving) are dropped. Runs between the link and section
 * phases of the unified save.
 */
function remapPrimaryTempRefs(
  settings: Record<string, unknown>,
  tempToReal: Map<string, string>,
): Record<string, unknown> {
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
    return settings;
  }
  const raw = (settings as Record<string, unknown>).primaryActions;
  if (!Array.isArray(raw)) return settings;
  const remapped: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    const tempMatch = /^link:(draft-.+)$/.exec(trimmed);
    if (tempMatch?.[1]) {
      const real = tempToReal.get(tempMatch[1]);
      if (real) remapped.push(`link:${real}`);
      continue;
    }
    remapped.push(trimmed);
  }
  return { ...settings, primaryActions: remapped };
}

async function applySectionsDraft(
  profileId: string,
  clientId: string,
  payload: UnifiedSavePayload,
  supabase: NonNullable<Awaited<ReturnType<typeof getServerClient>>>,
): Promise<{ ok: true } | DraftApplyError> {
  const current = await listProfileSections(profileId, clientId, supabase);
  if (!current.ok) return { ok: false, message: current.error.message };
  const planned = planSectionsDiff(current.data, payload.sections, payload.deletedSectionIds);
  if (!planned.ok) return { ok: false, message: planned.message };
  const { plan } = planned;

  const beforePaths = new Set<string>();
  for (const row of current.data) collectManagedPaths(row.settings, beforePaths);

  for (const id of plan.deletes) {
    const result = await deleteProfileSection(id, profileId, clientId, supabase);
    if (!result.ok) return { ok: false, message: result.error.message, sectionId: id };
  }

  const tempToReal = new Map<string, string>();
  for (const section of plan.adds) {
    const added = await addProfileSection(profileId, clientId, section.type, supabase);
    if (!added.ok) {
      const label = SECTION_TYPE_LABELS[section.type] ?? section.type;
      return {
        ok: false,
        message: `Could not add “${label}”: ${added.error.message}`,
        sectionId: section.tempId,
      };
    }
    const saved = await updateSectionSettings(
      added.data.id,
      profileId,
      clientId,
      section.settings,
      supabase,
    );
    if (!saved.ok) return { ok: false, message: saved.error.message };
    if (!section.enabled) {
      const toggled = await toggleProfileSection(
        added.data.id,
        profileId,
        clientId,
        false,
        supabase,
      );
      if (!toggled.ok) return { ok: false, message: toggled.error.message };
    }
    tempToReal.set(section.tempId, added.data.id);
  }

  for (const section of plan.settingsUpdates) {
    const result = await updateSectionSettings(
      section.id,
      profileId,
      clientId,
      section.settings,
      supabase,
    );
    if (!result.ok) {
      const currentRow = current.data.find((r) => r.id === section.id);
      const label = SECTION_TYPE_LABELS[currentRow?.type ?? ""] ?? "section";
      return {
        ok: false,
        message: `“${label}” settings are invalid: ${result.error.message}`,
        sectionId: section.id,
      };
    }
  }

  for (const section of plan.toggles) {
    const result = await toggleProfileSection(
      section.id,
      profileId,
      clientId,
      section.enabled,
      supabase,
    );
    if (!result.ok) return { ok: false, message: result.error.message, sectionId: section.id };
  }

  const finalOrder = mapDraftOrder(plan.order, tempToReal);
  if (finalOrder === null) {
    return { ok: false, message: "Could not save the section order. Please try again." };
  }
  const remaining = current.data.map((s) => s.id).filter((id) => !plan.deletes.includes(id));
  const addedIds = plan.adds.map((a) => tempToReal.get(a.tempId)).filter((id) => id !== undefined);
  if (finalOrder.join() !== [...remaining, ...addedIds].join()) {
    const result = await reorderProfileSections(profileId, clientId, finalOrder, supabase);
    if (!result.ok) return { ok: false, message: result.error.message };
  }

  // Best-effort orphan cleanup: section images/documents dropped from the
  // new settings are removed (same guarantee as the per-section save path).
  try {
    const fresh = await listProfileSections(profileId, clientId, supabase);
    if (fresh.ok) {
      const afterPaths = new Set<string>();
      for (const row of fresh.data) collectManagedPaths(row.settings, afterPaths);
      const orphaned = [...beforePaths].filter((path) => !afterPaths.has(path));
      if (orphaned.length > 0) {
        await Promise.all(orphaned.map((path) => removeAsset(path, supabase)));
      }
    }
  } catch {
    // Best-effort only.
  }
  return { ok: true };
}

/** Collect section-managed storage paths out of any settings shape. */
function collectManagedPaths(value: unknown, out: Set<string>): void {
  // Imported lazily at module scope below (storage is server-safe).
  if (typeof value === "string") {
    if (isManagedSectionImagePath(value) || isManagedDocumentPath(value)) out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectManagedPaths(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectManagedPaths(v, out);
  }
}

/**
 * Persist the whole editor draft in one action: profile columns, link
 * end-state (creates/updates/deletes/order), section end-state
 * (adds/deletes/settings/toggles/order), then a single revalidate + a
 * single public-cache purge. New profiles are created (with template +
 * seeded sections) and the client navigates to the edit page afterwards.
 *
 * Auth is verified once here; the service calls below re-verify in-process
 * (cheap local JWT checks, no extra round-trips — Track A holds).
 */
export async function saveUnifiedDraftAction(
  clientId: string,
  profileId: string | null,
  rawPayload: unknown,
): Promise<UnifiedSaveResult> {
  const parsed = unifiedSavePayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { ok: false, message: "Could not save. Check the highlighted fields.", step: 0 };
  }
  const payload = parsed.data;
  const supabase = await getServerClient({ requireAuth: true });
  if (!supabase) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: "Profile management is not configured yet." };
    }
    return { ok: false, message: "Sign in to manage profiles." };
  }

  let persisted: ProfileRow;
  let created = false;
  if (profileId) {
    const result = await updateProfileInternal(profileId, clientId, payload.profile, supabase, {
      skipAuth: true,
    });
    if (!result.ok) {
      return {
        ok: false,
        message: result.error.message,
        step: firstErrorStep(result.error.fieldErrors as Record<string, string> | undefined),
        fieldErrors: result.error.fieldErrors as Record<string, string> | undefined,
      };
    }
    persisted = result.data;
  } else {
    const result = await createProfileInternal(
      clientId,
      { ...payload.profile, template: payload.template },
      supabase,
      payload.newProfileId ?? undefined,
      { skipAuth: true },
    );
    if (!result.ok) {
      return {
        ok: false,
        message: result.error.message,
        step: firstErrorStep(result.error.fieldErrors as Record<string, string> | undefined),
        fieldErrors: result.error.fieldErrors as Record<string, string> | undefined,
      };
    }
    persisted = result.data;
    created = true;
  }

  cleanupStaleIdentityAssets(
    supabase,
    payload.previousAvatarPath,
    payload.previousCoverPath,
    persisted.avatar_path,
    persisted.cover_path,
  );

  const linksResult = await applyLinksDraft(persisted.id, clientId, payload, supabase);
  if (!linksResult.ok) return { ok: false, message: linksResult.message, step: 2 };

  // Newly promoted links resolve to real ids before sections persist.
  const sectionsPayload: UnifiedSavePayload = {
    ...payload,
    sections: payload.sections.map((section) =>
      section.type === "actions"
        ? {
            ...section,
            settings: remapPrimaryTempRefs(
              section.settings as Record<string, unknown>,
              linksResult.tempToReal,
            ),
          }
        : section,
    ),
  };

  const sectionsResult = await applySectionsDraft(
    persisted.id,
    clientId,
    sectionsPayload,
    supabase,
  );
  if (!sectionsResult.ok) {
    return {
      ok: false,
      message: sectionsResult.message,
      step: 3,
      sectionId: sectionsResult.sectionId,
    };
  }

  revalidatePath(dashboardPath(clientId));
  // Zero-stale public cache: repeat taps refetch exactly once after this save.
  revalidatePublicProfiles();

  const [links, sections] = await Promise.all([
    listProfileLinks(persisted.id, clientId, supabase),
    listProfileSections(persisted.id, clientId, supabase),
  ]);
  return {
    ok: true,
    profile: persisted,
    links: links.ok ? links.data : [],
    sections: sections.ok ? sections.data : [],
    created,
  };
}

/**
 * Resolve a pasted Maps link to exact coordinates (Phase 34.3, link-only
 * Location). Short links resolve server-side through the SSRF-safe
 * resolver (HTTPS-only, allowlisted hops, DNS-verified, bounded,
 * timeout-guarded, no bodies read); all other links extract directly.
 * Auth-gated (no anonymous abuse); no database touched. Coordinates enter
 * the draft — persistence stays with the unified Save.
 */
export type MapsResolveResult =
  | { ok: true; latitude: number; longitude: number; resolvedUrl: string }
  | { ok: false; message: string };

export async function resolveMapsLinkAction(rawUrl: string): Promise<MapsResolveResult> {
  const supabase = await getServerClient({ requireAuth: true });
  if (!supabase) {
    return { ok: false, message: "Sign in to configure locations." };
  }
  if (typeof rawUrl !== "string" || rawUrl.trim() === "" || rawUrl.length > 2048) {
    return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  }
  try {
    return await resolveMapLink(rawUrl, {
      fetchFn: async (url, init) => {
        const response = await fetch(url, {
          method: init.method,
          redirect: "manual",
          signal: init.signal,
        });
        return { status: response.status, location: response.headers.get("location") };
      },
      lookupFn: async (hostname: string) => {
        const found = await lookup(hostname);
        return typeof found === "string" ? found : found.address;
      },
    });
  } catch {
    return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  }
}

export type UploadFormState = {
  ok: boolean;
  message: string;
  path?: string;
  publicUrl?: string;
};

export async function uploadAssetAction(
  clientId: string,
  profileId: string,
  kind: "avatar" | "cover",
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Choose an image file." };
  const result = await uploadAsset(profileId, kind, file, supabase);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePublicProfiles();
  return {
    ok: true,
    message: "Uploaded. Save the profile to keep it.",
    path: result.path,
    publicUrl: publicAssetUrl(supabase, result.path) ?? undefined,
  };
}

/**
 * Upload a collection item image. Returns the storage path + preview URL;
 * the caller keeps the path in its settings draft until Save persists it.
 * Ownership-verified (profile must belong to the client); same validation
 * + normalize pipeline as identity assets.
 */
export async function uploadSectionImageAction(
  clientId: string,
  profileId: string,
  sectionType: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Choose an image file." };
  const result = await uploadSectionImage(clientId, profileId, sectionType, file, supabase);
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: "Uploaded. Save settings to keep it.",
    path: result.path,
    publicUrl: publicAssetUrl(supabase, result.path) ?? undefined,
  };
}

/**
 * Upload a CV document. Returns the storage path; the caller keeps it in
 * its settings draft until Save persists it. The private bucket is never
 * publicly readable — downloads go through GET /api/cv/[slug].
 */
export async function uploadDocumentAction(
  clientId: string,
  profileId: string,
  sectionType: string,
  _prevState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Choose a PDF file." };
  const result = await uploadDocument(clientId, profileId, sectionType, file, supabase);
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: "Uploaded. Save settings to keep it.",
    path: result.path,
  };
}
