"use client";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { suggestSlug, type DraftFields } from "@/features/profiles/unifiedDraft";
import { compatibleTemplates, defaultTemplateFor } from "@/features/profiles/profileTemplates";
import { displayProfileUrl, publicProfileUrl } from "@/features/profiles/urls";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { TemplateSwitcher } from "../TemplateSwitcher";
import { UploadControl } from "./UploadControl";

/**
 * Phase 34 — Step 1 Identity. Owns profile type, template (picker for new
 * profiles, reference switcher for existing ones — no page-level template
 * card remains), naming, slug, bio, and identity images.
 */
export function IdentityStep() {
  const { draft, dispatch, clientId, profileId, appUrl, avatarUrl, coverUrl, saveState } =
    useUnifiedEditor();
  const fieldErrors = saveState.fieldErrors;
  const isBusiness = draft.fields.profile_type === "BUSINESS";
  const avatarPreview = draft.avatarPreviewUrl ?? avatarUrl;
  const coverPreview = draft.coverPreviewUrl ?? coverUrl;

  function set(field: keyof DraftFields, value: string) {
    dispatch({ type: "setField", field, value });
  }

  return (
    <section
      aria-label="Identity"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
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
                  draft.fields.profile_type === type
                    ? "border-accent bg-surface text-text"
                    : "border-border text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="profile_type"
                  value={type}
                  checked={draft.fields.profile_type === type}
                  onChange={() => {
                    dispatch({ type: "setField", field: "profile_type", value: type });
                    // Keep the template compatible with the chosen type.
                    if (!compatibleTemplates(type).some((t) => t.id === draft.template)) {
                      dispatch({ type: "setTemplate", template: defaultTemplateFor(type) });
                    }
                  }}
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

        {draft.isNew ? (
          <div>
            <p id="template-label" className="text-sm font-medium text-text">
              Template
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Preloads the profile with a section set. Sections stay editable afterwards.
            </p>
            <div
              role="radiogroup"
              aria-labelledby="template-label"
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              {compatibleTemplates(draft.fields.profile_type).map((t) => (
                <label
                  key={t.id}
                  className={`radio-card cursor-pointer rounded-md border px-4 py-3 text-left ${
                    draft.template === t.id
                      ? "border-accent bg-surface text-text"
                      : "border-border text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={draft.template === t.id}
                    onChange={() => dispatch({ type: "setTemplate", template: t.id })}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug">{t.description}</span>
                </label>
              ))}
            </div>
          </div>
        ) : profileId ? (
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-text">Template</p>
            <div className="mt-2">
              <TemplateSwitcher
                clientId={clientId}
                profileId={profileId}
                profileType={draft.fields.profile_type}
                currentTemplate={draft.template}
              />
            </div>
          </div>
        ) : null}

        <Field
          id="profile-display-name"
          label={isBusiness ? "Business name" : "Display name"}
          error={fieldErrors?.display_name}
        >
          <Input
            name="display_name"
            type="text"
            value={draft.fields.display_name}
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
              value={draft.fields.slug}
              onChange={(e) => set("slug", e.target.value)}
              invalid={Boolean(fieldErrors?.slug)}
              required
            />
          </Field>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => set("slug", suggestSlug(draft.fields.display_name))}
              className="text-sm font-medium text-accent hover:underline"
            >
              Suggest from name
            </button>
            <p className="text-sm text-muted">
              Preview: {displayProfileUrl(publicProfileUrl(draft.fields.slug || "profile", appUrl))}{" "}
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
              value={draft.fields.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              invalid={Boolean(fieldErrors?.job_title)}
            />
          </Field>
          <Field id="profile-company" label="Company" error={fieldErrors?.company_name}>
            <Input
              name="company_name"
              type="text"
              autoComplete="organization"
              value={draft.fields.company_name}
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
            value={draft.fields.bio}
            onChange={(e) => set("bio", e.target.value)}
            invalid={Boolean(fieldErrors?.bio)}
          />
        </Field>
        <UploadControl
          label={isBusiness ? "Business Logo" : "Profile Photo"}
          kind="avatar"
          clientId={clientId}
          profileId={profileId}
          currentUrl={avatarPreview}
          hasImage={draft.fields.avatar_path !== ""}
          assetError={fieldErrors?.avatar_path}
          onUploaded={(path, url) => {
            dispatch({ type: "setAvatar", path, previewUrl: url || null });
          }}
          onRemove={() => dispatch({ type: "removeAvatar" })}
        />
        <UploadControl
          label="Cover Image"
          kind="cover"
          clientId={clientId}
          profileId={profileId}
          currentUrl={coverPreview}
          hasImage={draft.fields.cover_path !== ""}
          assetError={fieldErrors?.cover_path}
          onUploaded={(path, url) => {
            dispatch({ type: "setCover", path, previewUrl: url || null });
          }}
          onRemove={() => dispatch({ type: "removeCover" })}
        />
        {draft.fields.avatar_path !== "" || draft.fields.cover_path !== "" ? (
          <p className="text-sm text-muted">Image changes apply when you save the profile.</p>
        ) : null}
      </div>
    </section>
  );
}
