"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload, User } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  ContactActions,
  KartiAttribution,
  KeepProfilePreview,
  LocationBlock,
  ProfileHeader,
  ProfileLinksList,
  ProfileShell,
  ShareProfilePreview,
} from "@/components/public-profile/ProfilePreview";
import {
  saveProfileAction,
  setStatusAction,
  uploadAssetAction,
  type ProfileFormState,
  type UploadFormState,
} from "@/app/dashboard/clients/[id]/profile/actions";
import { suggestSlug } from "@/features/profiles/service";
import { ImageCropEditor } from "./ImageCropEditor";
import { displayProfileUrl, publicProfileUrl } from "@/features/profiles/urls";
import type { ProfileRow, ProfileLinkRow } from "@/features/profiles/types";
import type { ProfileTheme, ProfileType } from "@/features/profiles/schema";
import { LinksManager } from "./LinksManager";
import { ProfileStepperFooter } from "./ProfileStepperFooter";

const SAVE_INITIAL: ProfileFormState = {
  ok: false,
  error: { code: "VALIDATION_ERROR", message: "" },
};

const STEPS = [
  { id: "identity", label: "Identity" },
  { id: "contact", label: "Contact" },
  { id: "links", label: "Links" },
  { id: "appearance", label: "Appearance" },
  { id: "review", label: "Review" },
] as const;

/** Which wizard step owns each schema field (links save separately). */
const FIELD_STEPS: Record<string, number> = {
  profile_type: 0,
  slug: 0,
  display_name: 0,
  job_title: 0,
  company_name: 0,
  bio: 0,
  avatar_path: 0,
  cover_path: 0,
  phone: 1,
  whatsapp: 1,
  email: 1,
  website: 1,
  address: 1,
  maps_url: 1,
  accent_color: 3,
  theme: 3,
};

const UPLOAD_INITIAL: UploadFormState = { ok: false, message: "" };

const DEFAULT_ACCENT = "#0e7c5b";

type Draft = {
  profile_type: ProfileType;
  slug: string;
  display_name: string;
  job_title: string;
  company_name: string;
  bio: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  maps_url: string;
  accent_color: string;
  theme: ProfileTheme;
  avatar_path: string;
  cover_path: string;
};

function draftFromProfile(profile: ProfileRow | null, clientName: string): Draft {
  return {
    profile_type: (profile?.profile_type === "BUSINESS" ? "BUSINESS" : "PERSON") as ProfileType,
    slug: profile?.slug ?? suggestSlug(clientName),
    display_name: profile?.display_name ?? clientName,
    job_title: profile?.job_title ?? "",
    company_name: profile?.company_name ?? "",
    bio: profile?.bio ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    address: profile?.address ?? "",
    maps_url: profile?.maps_url ?? "",
    accent_color: profile?.accent_color ?? DEFAULT_ACCENT,
    theme: (profile?.theme === "dark" ? "dark" : "light") as ProfileTheme,
    avatar_path: profile?.avatar_path ?? "",
    cover_path: profile?.cover_path ?? "",
  };
}

function UploadControl({
  label,
  kind,
  clientId,
  profileId,
  currentUrl,
  hasImage,
  assetError,
  onUploaded,
  onRemove,
}: {
  label: string;
  kind: "avatar" | "cover";
  clientId: string;
  profileId: string | null;
  currentUrl: string | null;
  hasImage: boolean;
  assetError?: string;
  onUploaded: (path: string, url: string) => void;
  onRemove: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Open adjustment editor after select; upload happens only on confirm.
  const [editor, setEditor] = useState<{ file: File; url: string; origKb: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLLabelElement>(null);
  const inputId = useId();

  // Revoke the instant preview URL when it is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function clearLocalPreview() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
  }

  function resetInput() {
    if (fileRef.current) fileRef.current.value = "";
  }

  // No <form> here: this control lives inside the profile save form and
  // nested forms are invalid HTML (hydration error). Call the action directly.
  function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setFailed(false);
    setMessage("Uploading…");
    startTransition(async () => {
      const result = await uploadAssetAction(
        clientId,
        profileId ?? "pending",
        kind,
        UPLOAD_INITIAL,
        formData,
      );
      if (result.ok && result.path) {
        clearLocalPreview();
        setPickedName(null);
        onUploaded(result.path, result.publicUrl ?? "");
        resetInput();
      } else {
        resetInput();
      }
      setFailed(!result.ok);
      setMessage(result.message);
    });
  }

  function closeEditor() {
    if (editor) URL.revokeObjectURL(editor.url);
    setEditor(null);
    // Return focus to the choose control when the dialog unmounts.
    chooseRef.current?.focus();
  }

  function onSelect() {
    const file = fileRef.current?.files?.[0];
    clearLocalPreview();
    if (!file) {
      setPickedName(null);
      return;
    }
    // Instant client-side checks mirror storage.ts (server revalidates anyway).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFailed(true);
      setMessage("Only JPEG, PNG, or WebP images are allowed.");
      setPickedName(null);
      resetInput();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFailed(true);
      setMessage("Images must be 5 MB or smaller.");
      setPickedName(null);
      resetInput();
      return;
    }
    // Open the adjustment editor. Nothing uploads until confirm — the
    // previous image stays in place if the user cancels.
    setFailed(false);
    setMessage(null);
    setEditor({ file, url: URL.createObjectURL(file), origKb: (file.size / 1024).toFixed(0) });
  }

  function onEditorCancel() {
    closeEditor();
    setPickedName(null);
    resetInput();
  }

  function onEditorConfirm(cropped: File) {
    const origKb = editor?.origKb ?? (cropped.size / 1024).toFixed(0);
    closeEditor();
    setPickedName(`${cropped.name} · ${origKb} KB → ${(cropped.size / 1024).toFixed(0)} KB`);
    setLocalPreview(URL.createObjectURL(cropped));
    uploadFile(cropped);
  }

  if (!profileId) {
    return (
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-1 text-sm text-muted">Save the profile once to enable uploads.</p>
      </div>
    );
  }

  const previewUrl = localPreview ?? currentUrl;

  function handleRemove() {
    clearLocalPreview();
    if (fileRef.current) fileRef.current.value = "";
    setPickedName(null);
    onRemove();
  }

  const chooseLabel =
    hasImage || currentUrl
      ? label.includes("Logo")
        ? "Change logo"
        : "Change photo"
      : label.includes("Logo")
        ? "Choose logo"
        : "Choose photo";

  return (
    <div className="flex items-start gap-4">
      {editor ? (
        <ImageCropEditor
          file={editor.file}
          sourceUrl={editor.url}
          kind={kind}
          onConfirm={onEditorConfirm}
          onCancel={onEditorCancel}
        />
      ) : null}
      <div className="relative shrink-0">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={
                localPreview
                  ? `Selected ${label.toLowerCase()} uploading`
                  : `Current ${label.toLowerCase()}`
              }
              className={`object-cover ${
                kind === "avatar" ? "h-20 w-20 rounded-full" : "h-20 w-36 rounded-lg"
              }`}
            />
            {pending || localPreview ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-text/40"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </span>
            ) : null}
          </>
        ) : kind === "avatar" ? (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted text-muted"
          >
            <User className="h-8 w-8" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-muted"
          >
            <ImagePlus className="h-8 w-8" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-sm text-muted">
          JPEG, PNG, or WebP · max 5 MB · adjust the crop before upload.
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <label
            ref={chooseRef}
            htmlFor={inputId}
            tabIndex={-1}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-surface-muted px-4 text-sm font-medium text-text transition-colors hover:bg-border ${
              pending ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {pending ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent"
              />
            ) : (
              <Upload aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? "Uploading…" : chooseLabel}
          </label>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onSelect}
            disabled={pending}
            className="sr-only"
          />
          {hasImage || localPreview ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={pending}
              className="text-danger hover:bg-danger-muted hover:text-danger"
            >
              Remove
            </Button>
          ) : null}
        </div>
        <div aria-live="polite">
          {pickedName && !failed ? (
            <p className="truncate text-sm text-muted">{pickedName}</p>
          ) : null}
          {message && !pending ? (
            <p
              role={failed ? "alert" : "status"}
              className={`text-sm ${failed ? "font-medium text-danger" : "text-muted"}`}
            >
              {message}
            </p>
          ) : null}
          {assetError ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {assetError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusSection({ clientId, profile }: { clientId: string; profile: ProfileRow }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(status: "ACTIVE" | "INACTIVE") {
    setMessage("");
    startTransition(async () => {
      const result = await setStatusAction(clientId, profile.id, status);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  const activating = pending;
  const deactivating = pending;

  return (
    <section
      aria-label="Status"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">Status</h2>
        <StatusBadge status={profile.status} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {profile.status === "DRAFT"
          ? "Draft — not public yet. Activate when the details and links look right."
          : profile.status === "INACTIVE"
            ? "Inactive — currently unavailable publicly."
            : "Active — the public page is live."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {profile.status !== "ACTIVE" ? (
          <form action={() => changeStatus("ACTIVE")}>
            <Button type="submit" loading={activating}>
              {activating
                ? "Activating…"
                : profile.status === "INACTIVE"
                  ? "Reactivate"
                  : "Activate Profile"}
            </Button>
          </form>
        ) : (
          <form action={() => changeStatus("INACTIVE")}>
            <Button type="submit" variant="secondary" loading={deactivating}>
              {deactivating ? "Deactivating…" : "Deactivate Profile"}
            </Button>
          </form>
        )}
      </div>
      {message ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function ProfileEditor({
  clientId,
  clientName,
  profile,
  links,
  newProfileId,
  initialAvatarUrl,
  initialCoverUrl,
  justCreated,
  appUrl,
}: {
  clientId: string;
  clientName: string;
  profile: ProfileRow | null;
  links: ProfileLinkRow[];
  newProfileId: string | null;
  initialAvatarUrl: string | null;
  initialCoverUrl: string | null;
  justCreated: boolean;
  appUrl: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromProfile(profile, clientName));
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  async function saveWithJump(
    prevState: ProfileFormState,
    formData: FormData,
  ): Promise<ProfileFormState> {
    const next = await saveProfileAction.bind(
      null,
      clientId,
      profile?.id ?? null,
    )(prevState, formData);
    // A failed save can flag fields on a hidden step — jump to the first one
    // so the banner is never shown without its highlighted field. This runs
    // in the form-submission handler (batched, no cascading render).
    if (!next.ok && next.error.code === "VALIDATION_ERROR" && next.error.fieldErrors) {
      const keys = Object.keys(next.error.fieldErrors);
      if (keys.length > 0) setStep(Math.min(...keys.map((key) => FIELD_STEPS[key] ?? 0)));
    }
    return next;
  }

  const [saveState, saveAction, saving] = useActionState(saveWithJump, SAVE_INITIAL);

  const effectiveProfileId = profile?.id ?? newProfileId;
  const isBusiness = draft.profile_type === "BUSINESS";
  const fieldErrors = saveState.ok === false ? saveState.error.fieldErrors : undefined;
  const validationFailed = saveState.ok === false && saveState.error.code === "VALIDATION_ERROR";
  const formError =
    saveState.ok === false && saveState.error.code !== "VALIDATION_ERROR"
      ? saveState.error.message
      : null;
  const errorCount = validationFailed && fieldErrors ? Object.keys(fieldErrors).length : 0;

  function stepErrorCount(index: number): number {
    if (!fieldErrors) return 0;
    return Object.keys(fieldErrors).filter((key) => (FIELD_STEPS[key] ?? -1) === index).length;
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const dark = draft.theme === "dark";
  const accent = /^#[0-9a-f]{6}$/i.test(draft.accent_color) ? draft.accent_color : DEFAULT_ACCENT;
  const subtitle = draft.job_title.trim() || null;
  const previewLinks = links
    .filter((l) => l.enabled)
    .map((l) => ({ id: l.id, type: l.type, label: l.label, url: l.url }));

  const editorPane = (
    <form action={saveAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="avatar_path" value={draft.avatar_path} />
      <input type="hidden" name="cover_path" value={draft.cover_path} />
      <input type="hidden" name="previous_avatar_path" value={profile?.avatar_path ?? ""} />
      <input type="hidden" name="previous_cover_path" value={profile?.cover_path ?? ""} />
      {newProfileId ? <input type="hidden" name="new_profile_id" value={newProfileId} /> : null}

      {justCreated ? (
        <p
          role="status"
          className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted"
        >
          Profile created as draft. Add details, then activate when ready.
        </p>
      ) : null}
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}
      {validationFailed && saveState.error.message ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {errorCount > 0
            ? `${errorCount} field${errorCount === 1 ? "" : "s"} need${errorCount === 1 ? "s" : ""} attention — showing the first one below.`
            : saveState.error.message}
        </p>
      ) : null}
      {saveState.ok ? (
        <p
          role="status"
          className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted"
        >
          Saved.
        </p>
      ) : null}

      <nav aria-label="Profile steps">
        <ol className="flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => {
            const current = i === step;
            const done = i < step;
            const errors = stepErrorCount(i);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={current ? "step" : undefined}
                  aria-label={
                    errors > 0
                      ? `${s.label}, step ${i + 1}, ${errors} field${errors === 1 ? "" : "s"} need attention`
                      : `${s.label}, step ${i + 1}`
                  }
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                    errors > 0
                      ? "border-danger text-danger"
                      : current
                        ? "border-accent bg-surface text-text"
                        : done
                          ? "border-border bg-surface-muted text-text"
                          : "border-border bg-surface text-muted hover:text-text"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      errors > 0
                        ? "bg-danger text-white"
                        : current
                          ? "bg-accent text-accent-contrast"
                          : done
                            ? "bg-accent/15 text-accent"
                            : "bg-surface-muted text-muted"
                    }`}
                  >
                    {errors > 0 ? errors : done ? "✓" : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section
        aria-label="Identity"
        className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${step === 0 ? "" : "hidden"}`}
      >
        <h2 className="text-base font-semibold text-text">Identity</h2>
        <p className="mt-1 text-sm text-muted">Who is this page for? This shows at the top.</p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p id="profile-type-label" className="text-sm font-medium text-text">
              Profile type
            </p>
            <div
              role="radiogroup"
              aria-labelledby="profile-type-label"
              aria-describedby={fieldErrors?.profile_type ? "profile-type-error" : undefined}
              aria-invalid={Boolean(fieldErrors?.profile_type) || undefined}
              className="mt-2 flex gap-2"
            >
              {(["PERSON", "BUSINESS"] as const).map((type) => (
                <label
                  key={type}
                  className={`radio-card inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium ${
                    draft.profile_type === type
                      ? "border-accent bg-surface text-text"
                      : "border-border text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="profile_type"
                    value={type}
                    checked={draft.profile_type === type}
                    onChange={() => set("profile_type", type)}
                    className="sr-only"
                  />
                  {type === "PERSON" ? "Individual" : "Business"}
                </label>
              ))}
            </div>
            {fieldErrors?.profile_type ? (
              <p
                id="profile-type-error"
                role="alert"
                className="mt-1 text-sm font-medium text-danger"
              >
                {fieldErrors.profile_type}
              </p>
            ) : null}
          </div>
          <Field
            id="profile-display-name"
            label={isBusiness ? "Business name" : "Display name"}
            error={fieldErrors?.display_name}
          >
            <Input
              name="display_name"
              type="text"
              value={draft.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              invalid={Boolean(fieldErrors?.display_name)}
              required
            />
          </Field>
          <div>
            <Field id="profile-slug" label="Public slug" error={fieldErrors?.slug}>
              <Input
                name="slug"
                type="text"
                inputMode="url"
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                invalid={Boolean(fieldErrors?.slug)}
                required
              />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => set("slug", suggestSlug(draft.display_name))}
                className="text-sm font-medium text-accent hover:underline"
              >
                Suggest from name
              </button>
              <p className="text-sm text-muted">
                Preview: {displayProfileUrl(publicProfileUrl(draft.slug || "profile", appUrl))}{" "}
                (unsaved — save to publish)
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="profile-job"
              label={isBusiness ? "Category" : "Job title"}
              error={fieldErrors?.job_title}
            >
              <Input
                name="job_title"
                type="text"
                placeholder={isBusiness ? "Restaurant" : "Developer"}
                value={draft.job_title}
                onChange={(e) => set("job_title", e.target.value)}
                invalid={Boolean(fieldErrors?.job_title)}
              />
            </Field>
            <Field id="profile-company" label="Company" error={fieldErrors?.company_name}>
              <Input
                name="company_name"
                type="text"
                autoComplete="organization"
                value={draft.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                invalid={Boolean(fieldErrors?.company_name)}
              />
            </Field>
          </div>
          <Field
            id="profile-bio"
            label={isBusiness ? "Description" : "Short bio"}
            error={fieldErrors?.bio}
          >
            <Textarea
              name="bio"
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
              invalid={Boolean(fieldErrors?.bio)}
            />
          </Field>
          <UploadControl
            label={isBusiness ? "Business Logo" : "Profile Photo"}
            kind="avatar"
            clientId={clientId}
            profileId={effectiveProfileId}
            currentUrl={avatarUrl}
            hasImage={draft.avatar_path !== ""}
            assetError={fieldErrors?.avatar_path}
            onUploaded={(path, url) => {
              set("avatar_path", path);
              setAvatarUrl(url || null);
            }}
            onRemove={() => {
              set("avatar_path", "");
              setAvatarUrl(null);
            }}
          />
          <UploadControl
            label="Cover Image"
            kind="cover"
            clientId={clientId}
            profileId={effectiveProfileId}
            currentUrl={coverUrl}
            hasImage={draft.cover_path !== ""}
            assetError={fieldErrors?.cover_path}
            onUploaded={(path, url) => {
              set("cover_path", path);
              setCoverUrl(url || null);
            }}
            onRemove={() => {
              set("cover_path", "");
              setCoverUrl(null);
            }}
          />
          {draft.avatar_path !== "" || draft.cover_path !== "" ? (
            <p className="text-sm text-muted">Image changes apply when you save the profile.</p>
          ) : null}
        </div>
      </section>

      <section
        aria-label="Contact"
        className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${step === 1 ? "" : "hidden"}`}
      >
        <h2 className="text-base font-semibold text-text">Contact & location</h2>
        <p className="mt-1 text-sm text-muted">Only filled fields appear on the public page.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="profile-phone" label="Phone" error={fieldErrors?.phone}>
            <Input
              name="phone"
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              invalid={Boolean(fieldErrors?.phone)}
            />
          </Field>
          <Field id="profile-whatsapp" label="WhatsApp" error={fieldErrors?.whatsapp}>
            <Input
              name="whatsapp"
              type="tel"
              value={draft.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              invalid={Boolean(fieldErrors?.whatsapp)}
            />
          </Field>
          <Field id="profile-email" label="Email" error={fieldErrors?.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              invalid={Boolean(fieldErrors?.email)}
            />
          </Field>
          <Field id="profile-website" label="Website" error={fieldErrors?.website}>
            <Input
              name="website"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
              invalid={Boolean(fieldErrors?.website)}
            />
          </Field>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text">Location</h3>
          <div className="mt-3 flex flex-col gap-4">
            <Field id="profile-address" label="Address" error={fieldErrors?.address}>
              <Input
                name="address"
                type="text"
                autoComplete="street-address"
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                invalid={Boolean(fieldErrors?.address)}
              />
            </Field>
            <Field id="profile-maps" label="Maps URL" error={fieldErrors?.maps_url}>
              <Input
                name="maps_url"
                type="url"
                inputMode="url"
                placeholder="https://maps.google.com/…"
                value={draft.maps_url}
                onChange={(e) => set("maps_url", e.target.value)}
                invalid={Boolean(fieldErrors?.maps_url)}
              />
            </Field>
          </div>
        </div>
      </section>

      <section
        aria-label="Links"
        className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${step === 2 ? "" : "hidden"}`}
      >
        <h2 className="text-base font-semibold text-text">Links</h2>
        <p className="mt-1 text-sm text-muted">
          Social and action links. Reorder with the arrow buttons — the public page follows this
          order.
        </p>
        <div className="mt-4">
          <LinksManager clientId={clientId} profileId={effectiveProfileId} links={links} />
        </div>
      </section>

      <section
        aria-label="Appearance"
        className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${step === 3 ? "" : "hidden"}`}
      >
        <h2 className="text-base font-semibold text-text">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Theme and accent color. The preview updates live.</p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p id="profile-theme-label" className="text-sm font-medium text-text">
              Theme
            </p>
            <div
              role="radiogroup"
              aria-labelledby="profile-theme-label"
              aria-describedby={fieldErrors?.theme ? "profile-theme-error" : undefined}
              aria-invalid={Boolean(fieldErrors?.theme) || undefined}
              className="mt-2 flex gap-2"
            >
              {(["light", "dark"] as const).map((theme) => (
                <label
                  key={theme}
                  className={`radio-card inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium capitalize ${
                    draft.theme === theme
                      ? "border-accent bg-surface text-text"
                      : "border-border text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={draft.theme === theme}
                    onChange={() => set("theme", theme)}
                    className="sr-only"
                  />
                  {theme}
                </label>
              ))}
            </div>
            {fieldErrors?.theme ? (
              <p
                id="profile-theme-error"
                role="alert"
                className="mt-1 text-sm font-medium text-danger"
              >
                {fieldErrors.theme}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="profile-accent-picker" className="text-sm font-medium text-text">
                Accent color
              </label>
              <input
                id="profile-accent-picker"
                type="color"
                value={accent}
                onChange={(e) => set("accent_color", e.target.value)}
                className="mt-2 block h-11 w-20 cursor-pointer rounded-md border border-border bg-surface"
              />
            </div>
            <Field id="profile-accent" label="Hex value" error={fieldErrors?.accent_color}>
              <Input
                name="accent_color"
                type="text"
                inputMode="text"
                placeholder="#0e7c5b"
                value={draft.accent_color}
                onChange={(e) => set("accent_color", e.target.value)}
                invalid={Boolean(fieldErrors?.accent_color)}
              />
            </Field>
          </div>
        </div>
      </section>

      <section
        aria-label="Review"
        className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${step === 4 ? "" : "hidden"}`}
      >
        <h2 className="text-base font-semibold text-text">Review</h2>
        <p className="mt-1 text-sm text-muted">
          Check the summary, save, then activate when ready. Activation needs a name and a valid
          slug.
        </p>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Display name</dt>
            <dd className="break-all text-right font-medium text-text">
              {draft.display_name.trim() || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Slug</dt>
            <dd className="break-all text-right font-mono text-text">
              /{draft.slug.trim() || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Type</dt>
            <dd className="text-right text-text">
              {draft.profile_type === "BUSINESS" ? "Business" : "Individual"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Contact</dt>
            <dd className="break-all text-right text-text">
              {[draft.phone.trim(), draft.email.trim()].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Links</dt>
            <dd className="text-right text-text">
              {links.length === 0
                ? "No links yet"
                : `${links.length} link${links.length === 1 ? "" : "s"} (${links.filter((l) => l.enabled).length} enabled)`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Theme</dt>
            <dd className="text-right capitalize text-text">{draft.theme}</dd>
          </div>
        </dl>
        {!effectiveProfileId ? (
          <p className="mt-3 text-sm text-muted">
            Save once to enable photo uploads and links, then come back to finish.
          </p>
        ) : null}
      </section>

      <ProfileStepperFooter
        step={step}
        totalSteps={STEPS.length}
        stepLabel={STEPS[step]?.label ?? ""}
        nextStepLabel={step < STEPS.length - 1 ? (STEPS[step + 1]?.label ?? null) : null}
        saveLabel={profile ? "Save draft" : "Create profile"}
        saving={saving}
        onPrevious={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
      />
    </form>
  );

  const previewPane = (
    <div id="preview" className="flex scroll-mt-6 flex-col gap-3 md:sticky md:top-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted md:text-center">
        Phone preview · updates as you type
      </p>
      <ProfileShell theme={draft.theme} accent={accent}>
        <ProfileHeader
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          displayName={draft.display_name}
          subtitle={subtitle}
          company={draft.company_name.trim() || null}
          bio={draft.bio.trim() || null}
          dark={dark}
        />
        <ContactActions
          contact={{
            phone: draft.phone.trim() || null,
            whatsapp: draft.whatsapp.trim() || null,
            email: draft.email.trim() || null,
            website: draft.website.trim() || null,
          }}
          dark={dark}
        />
        <ProfileLinksList links={previewLinks} dark={dark} />
        <LocationBlock
          address={draft.address.trim() || null}
          mapsUrl={draft.maps_url.trim() || null}
          dark={dark}
        />
        <KeepProfilePreview dark={dark} />
        <ShareProfilePreview dark={dark} />
        <KartiAttribution dark={dark} />
      </ProfileShell>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Editor view"
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1 md:hidden"
      >
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-10 rounded-md text-sm font-medium capitalize ${
              tab === t ? "bg-surface-muted text-text" : "text-muted"
            }`}
          >
            {t === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`min-w-0 ${tab === "edit" ? "" : "hidden md:block"}`}>{editorPane}</div>
        <div className={`min-w-0 ${tab === "preview" ? "" : "hidden md:block"}`}>{previewPane}</div>
      </div>
      {profile ? <StatusSection clientId={clientId} profile={profile} /> : null}
    </div>
  );
}
