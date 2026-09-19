"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProfile, setProfileStatus, updateProfile } from "@/features/profiles/service";
import {
  createProfileLink,
  deleteProfileLink,
  reorderProfileLinks,
  toggleProfileLink,
  updateProfileLink,
} from "@/features/profiles/links";
import { publicAssetUrl, removeAsset, uploadAsset } from "@/features/profiles/storage";
import type { ProfileResult, ProfileRow } from "@/features/profiles/types";
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

async function getServerClient() {
  try {
    return await createClient();
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
  const supabase = await getServerClient();
  if (!supabase) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Profile management is not configured yet." },
      values,
    };
  }

  const previousAvatar = String(formData.get("previous_avatar_path") ?? "");
  const previousCover = String(formData.get("previous_cover_path") ?? "");

  const result = profileId
    ? await updateProfile(profileId, clientId, values, supabase)
    : await createProfile(
        clientId,
        values,
        supabase,
        String(formData.get("new_profile_id") ?? "") || undefined,
      );

  if (!result.ok) return { ...result, values };

  // Safe replacement order: new object is stored + referenced before the old one goes.
  if (previousAvatar !== "" && previousAvatar !== (result.data.avatar_path ?? "")) {
    await removeAsset(previousAvatar, supabase);
  }
  if (previousCover !== "" && previousCover !== (result.data.cover_path ?? "")) {
    await removeAsset(previousCover, supabase);
  }

  if (!profileId) {
    redirect(`${dashboardPath(clientId)}?created=1`);
  }
  revalidatePath(dashboardPath(clientId));
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true, data: result.data };
}

export async function setStatusAction(
  clientId: string,
  profileId: string,
  status: string,
): Promise<StatusFormState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Profile management is not configured yet." };
  const result = await setProfileStatus(profileId, clientId, status, supabase);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(dashboardPath(clientId));
  revalidatePath(`/dashboard/clients/${clientId}`);
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
  return { ok: true };
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
  return {
    ok: true,
    message: "Uploaded. Save the profile to keep it.",
    path: result.path,
    publicUrl: publicAssetUrl(supabase, result.path) ?? undefined,
  };
}
