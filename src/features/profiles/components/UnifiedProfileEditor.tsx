"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { BuilderPreview } from "@/components/public-profile/BuilderPreview";
import { Button } from "@/components/ui/Button";
import {
  saveUnifiedDraftAction,
  type UnifiedSaveResult,
} from "@/app/dashboard/clients/[id]/profile/actions";
import { computeCompletion } from "@/features/profiles/completion";
import type { ProfileLinkRow, ProfileRow, ProfileSectionRow } from "@/features/profiles/types";
import { displayProfileUrl, isProfileLinkPublic, publicProfileUrl } from "@/features/profiles/urls";
import {
  buildSavePayload,
  draftReducer,
  EDITOR_STEPS,
  FIELD_STEPS,
  initDraft,
  toPreviewData,
  type DraftAction,
  type EditorDraft,
} from "@/features/profiles/unifiedDraft";
import { ProfileStepperFooter } from "./ProfileStepperFooter";
import { IdentityStep } from "./unified/IdentityStep";
import { ContactStep } from "./unified/ContactStep";
import { LinksStep } from "./unified/LinksStep";
import { SectionsStep } from "./unified/SectionsStep";
import { AppearanceStep } from "./unified/AppearanceStep";
import { ReviewStep } from "./unified/ReviewStep";

/* ------------------------------------------------------------------ */
/* Context — ONE draft shared by every step and the single preview.    */
/* ------------------------------------------------------------------ */

export type SaveState = {
  saving: boolean;
  saved: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
  /** Failing section id from the unified save (Phase 34.2 focus target). */
  sectionId?: string;
};

export type EditorContextValue = {
  draft: EditorDraft;
  dispatch: Dispatch<DraftAction>;
  clientId: string;
  clientName: string;
  profileId: string | null;
  newProfileId: string | null;
  appUrl: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  publicCode: string;
  justCreated: boolean;
  sectionsAvailable: boolean;
  saveState: SaveState;
  save: () => void;
  tempId: () => string;
  step: number;
  setStep: (step: number) => void;
};

export const UnifiedEditorContext = createContext<EditorContextValue | null>(null);

export function useUnifiedEditor(): EditorContextValue {
  const value = useContext(UnifiedEditorContext);
  if (!value) throw new Error("useUnifiedEditor must be used inside UnifiedProfileEditor");
  return value;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function UnifiedProfileEditor({
  clientId,
  clientName,
  profile,
  links,
  sections,
  template,
  newProfileId,
  initialAvatarUrl,
  initialCoverUrl,
  justCreated,
  appUrl,
  publicCode,
}: {
  clientId: string;
  clientName: string;
  profile: ProfileRow | null;
  links: ProfileLinkRow[];
  sections: ProfileSectionRow[] | null;
  template: string;
  newProfileId: string | null;
  initialAvatarUrl: string | null;
  initialCoverUrl: string | null;
  justCreated: boolean;
  appUrl: string;
  publicCode: string;
}) {
  const router = useRouter();
  const [draft, dispatch] = useReducer(
    draftReducer,
    { profile, clientName, links, sections: sections ?? [], template },
    (input) =>
      initDraft({
        profile: input.profile,
        clientName: input.clientName,
        links: input.links,
        sections: input.sections,
        template: input.template,
      }),
  );
  const [step, setStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({
    saving: false,
    saved: false,
    error: null,
  });
  const tempCounter = useRef(0);
  const baselineRef = useRef({
    avatarPath: profile?.avatar_path ?? "",
    coverPath: profile?.cover_path ?? "",
  });

  const tempId = useCallback(() => {
    tempCounter.current += 1;
    return `draft-${Date.now().toString(36)}-${tempCounter.current}`;
  }, []);

  const profileId = profile?.id ?? null;

  const save = useCallback(() => {
    if (saveState.saving) return;
    setSaveState({ saving: true, saved: false, error: null, sectionId: undefined });
    const payload = buildSavePayload(draft, baselineRef.current, draft.isNew ? newProfileId : null);
    void (async () => {
      let result: UnifiedSaveResult;
      try {
        result = await saveUnifiedDraftAction(clientId, profileId, payload);
      } catch {
        setSaveState({ saving: false, saved: false, error: "Could not save. Please try again." });
        return;
      }
      if (result.ok) {
        baselineRef.current = {
          avatarPath: result.profile.avatar_path ?? "",
          coverPath: result.profile.cover_path ?? "",
        };
        dispatch({
          type: "rebase",
          profile: result.profile,
          links: result.links,
          sections: result.sections,
        });
        // New profiles gain their server identity (links/sections/uploads unlock).
        if (result.created) {
          router.push(`/dashboard/clients/${clientId}/profile?created=1`);
          return;
        }
        setSaveState({ saving: false, saved: true, error: null });
        router.refresh();
      } else {
        if (typeof result.step === "number") setStep(result.step);
        setSaveState({
          saving: false,
          saved: false,
          error: result.message,
          fieldErrors: result.fieldErrors,
          sectionId: result.ok === false ? result.sectionId : undefined,
        });
      }
    })();
  }, [saveState.saving, draft, newProfileId, clientId, profileId, router]);

  // Step fields clear their save error as soon as the operator edits again.
  const fieldErrors = saveState.fieldErrors;

  function stepErrorCount(index: number): number {
    if (!fieldErrors) return 0;
    return Object.keys(fieldErrors).filter((key) => (FIELD_STEPS[key] ?? -1) === index).length;
  }

  // Warn before discarding unsaved draft edits.
  useEffect(() => {
    if (!draft.dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft.dirty]);

  // Escape closes the mobile preview sheet.
  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const preview = useMemo(
    () =>
      toPreviewData(draft, {
        profileId: profileId ?? newProfileId ?? "preview",
        publicCode,
      }),
    [draft, profileId, newProfileId, publicCode],
  );
  const avatarPreview = draft.avatarPreviewUrl ?? initialAvatarUrl;
  const coverPreview = draft.coverPreviewUrl ?? initialCoverUrl;

  const completion = useMemo(
    () =>
      computeCompletion(
        {
          display_name: draft.fields.display_name,
          avatar_path: draft.fields.avatar_path || null,
          cover_path: draft.fields.cover_path || null,
          phone: draft.fields.phone || null,
          whatsapp: draft.fields.whatsapp || null,
          email: draft.fields.email || null,
          website: draft.fields.website || null,
          bio: draft.fields.bio || null,
          status: draft.status,
        },
        draft.links.map((l) => ({ enabled: l.enabled })),
        draft.sections.map((s) => ({ type: s.type, enabled: s.enabled, settings: s.settings })),
      ),
    [draft],
  );

  const liveUrl = publicProfileUrl(draft.fields.slug || "profile", appUrl);
  const isPublic = isProfileLinkPublic(draft.status);

  const contextValue: EditorContextValue = {
    draft,
    dispatch,
    clientId,
    clientName,
    profileId,
    newProfileId,
    appUrl,
    avatarUrl: initialAvatarUrl,
    coverUrl: initialCoverUrl,
    publicCode,
    justCreated,
    sectionsAvailable: sections !== null,
    saveState: { ...saveState, fieldErrors },
    save,
    tempId,
    step,
    setStep,
  };

  const totalErrors = fieldErrors ? Object.keys(fieldErrors).length : 0;

  return (
    <UnifiedEditorContext.Provider value={contextValue}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        {/* Compact header: title + status + progress + public action. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 flex-1 text-xl font-bold text-text">Edit Profile</h1>
          <StatusBadge status={draft.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-text" aria-live="polite">
            {completion.percent}% complete
          </span>
          <span aria-hidden="true" className="text-border">
            |
          </span>
          {saveState.saving ? (
            <span className="text-muted" role="status">
              Saving…
            </span>
          ) : saveState.saved && !draft.dirty ? (
            <span className="font-medium text-success" role="status">
              Saved
            </span>
          ) : draft.dirty ? (
            <span className="font-medium text-warning" role="status">
              Unsaved changes
            </span>
          ) : (
            <span className="text-muted" role="status">
              No unsaved changes
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="ml-auto"
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            Preview
          </Button>
          {isPublic ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-muted"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              Open profile
            </a>
          ) : (
            <span className="hidden truncate font-mono text-[13px] text-muted sm:block">
              {displayProfileUrl(liveUrl)}
            </span>
          )}
        </div>

        {justCreated ? (
          <p
            role="status"
            className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted"
          >
            Profile created as draft. Add details, then activate when ready.
          </p>
        ) : null}
        {saveState.error ? (
          <p
            role="alert"
            className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
          >
            {totalErrors > 0
              ? `${totalErrors} field${totalErrors === 1 ? "" : "s"} need${totalErrors === 1 ? "s" : ""} attention — showing the first one below.`
              : saveState.error}
          </p>
        ) : null}
        {saveState.saved && !draft.dirty && !saveState.error ? (
          <p
            role="status"
            className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted"
          >
            Saved.
          </p>
        ) : null}

        {/* Step navigation: the single navigation model for the editor. */}
        <nav aria-label="Profile steps">
          <ol className="flex flex-wrap gap-1.5">
            {EDITOR_STEPS.map((s, i) => {
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

        {/* Phase 34.1: the editor is always the screen. Below desktop the
            live preview opens from the header Preview button as a
            full-screen sheet — no Edit/Preview tabs, no second preview. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            {step === 0 ? <IdentityStep /> : null}
            {step === 1 ? <ContactStep /> : null}
            {step === 2 ? <LinksStep /> : null}
            {step === 3 ? <SectionsStep /> : null}
            {step === 4 ? <AppearanceStep /> : null}
            {step === 5 ? <ReviewStep completion={completion} /> : null}

            <div className="mt-6">
              <ProfileStepperFooter
                step={step}
                totalSteps={EDITOR_STEPS.length}
                stepLabel={EDITOR_STEPS[step]?.label ?? ""}
                nextStepLabel={
                  step < EDITOR_STEPS.length - 1 ? (EDITOR_STEPS[step + 1]?.label ?? null) : null
                }
                saveLabel={profile ? "Save draft" : "Create profile"}
                saving={saveState.saving}
                onPrevious={() => setStep((s) => Math.max(0, s - 1))}
                onNext={() => setStep((s) => Math.min(EDITOR_STEPS.length - 1, s + 1))}
              />
            </div>
          </div>

          {/* THE single preview: real renderer, draft-fed, sticky on desktop.
              Below desktop it stays mounted but hidden — the sheet carries
              the only other render, and only while open. */}
          <div className="hidden min-w-0 lg:block">
            <div className="flex scroll-mt-6 flex-col gap-3 lg:sticky lg:top-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted lg:text-center">
                Phone preview · updates as you type
              </p>
              <BuilderPreview
                profile={preview.profile}
                links={preview.links}
                sections={preview.sections}
                avatarUrl={avatarPreview}
                coverUrl={coverPreview}
              />
            </div>
          </div>
        </div>
      </form>

      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Profile preview sheet"
          className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="mx-auto flex max-h-full w-full max-w-[400px] flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">Phone preview · updates as you type</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSheetOpen(false)}
                autoFocus
              >
                Close
              </Button>
            </div>
            <BuilderPreview
              profile={preview.profile}
              links={preview.links}
              sections={preview.sections}
              avatarUrl={avatarPreview}
              coverUrl={coverPreview}
            />
          </div>
        </div>
      ) : null}
    </UnifiedEditorContext.Provider>
  );
}
