"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  LayoutTemplate,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ensureSectionsAction,
  resolveMapsLinkAction,
  uploadDocumentAction,
  uploadSectionImageAction,
} from "@/app/dashboard/clients/[id]/profile/actions";
import {
  getCatalogEntry,
  isFoundationSectionType,
  moveSectionId,
  type SectionCatalogEntry,
} from "@/features/profiles/sectionCatalog";
import { defaultSectionSettings } from "@/features/profiles/sectionSettings";
import type { DraftSection } from "@/features/profiles/unifiedDraft";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { AddSectionModal } from "../AddSectionModal";
import { SectionPresetBar } from "../SectionPresetBar";
import { SectionSettingsRenderer } from "../section-settings/SectionSettingsRenderer";

function catalogFor(type: string): SectionCatalogEntry | null {
  return getCatalogEntry(type);
}

function sectionLabel(type: string): string {
  return catalogFor(type)?.label ?? type;
}

/** Where a core section is configured in the unified editor. */
function coreStepHint(type: string): { label: string; step: number } | null {
  if (type === "hero") return { label: "Cover, photo and name live in Identity", step: 0 };
  if (type === "actions") return { label: "Quick actions live in Contact", step: 1 };
  if (type === "links") return { label: "Links live in the Links step", step: 2 };
  return null;
}

/**
 * Phase 34 — Step 4 Sections (draft-native in Phase 34.2). The flexible
 * builder lives here: Add Section, content-block cards with inline
 * draft-live editors, and ONE page-order list. Core sections
 * (hero/actions/links) render as compact order rows — they are configured
 * in their own steps, never duplicated as content cards.
 */
export function SectionsStep() {
  const { draft, dispatch, clientId, profileId, tempId, sectionsAvailable, setStep, saveState } =
    useUnifiedEditor();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Open editor per section (new rows auto-expand; see add()).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Failed-save focus: expand the offending card via render-time adjustment
  // (also applies before effects run — SSR-safe). Scroll + focus stay in
  // the effect below, which performs no state updates.
  const [expandedForError, setExpandedForError] = useState<string | null>(null);
  if (saveState.sectionId && saveState.sectionId !== expandedForError) {
    setExpandedForError(saveState.sectionId);
    setExpandedId(saveState.sectionId);
  }
  // Fresh-row focus target: cleared once its editor collapses. State (not
  // a ref) because render reads it for autoFocus.
  const [freshId, setFreshId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, startRestoring] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  // Scroll + focus for the failed-save card (no state updates here).
  useEffect(() => {
    const target = saveState.sectionId;
    if (!target) return;
    const el = itemRefs.current.get(target);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.querySelector<HTMLButtonElement>("[data-configure-button]")?.focus({ preventScroll: true });
  }, [saveState.sectionId]);

  if (!profileId) {
    return (
      <section
        aria-label="Sections"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Sections</h2>
        <p className="mt-2 text-sm text-muted">
          Save the profile first, then add content blocks here.
        </p>
      </section>
    );
  }

  if (!sectionsAvailable) {
    return (
      <section
        aria-label="Sections"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Sections</h2>
        <p className="mt-2 text-sm text-muted" role="note">
          Section ordering is unavailable until migration 20260925 is applied. The public profile
          renders the default order meanwhile.
        </p>
      </section>
    );
  }

  const ordered = [...draft.sections].sort((a, b) => a.position - b.position);
  const addedTypes = new Set(ordered.map((s) => s.type));

  function commitOrder(next: string[]) {
    dispatch({ type: "setSectionOrder", ids: next });
  }

  function move(sectionId: string, direction: -1 | 1) {
    const ids = ordered.map((s) => s.id);
    commitOrder(moveSectionId(ids, sectionId, ids.indexOf(sectionId) + direction));
  }

  function add(type: string) {
    const entry = getCatalogEntry(type);
    if (!entry || entry.status !== "live") return;
    if (!(entry.supportedProfiles as string[]).includes(draft.fields.profile_type)) return;
    if (addedTypes.has(type)) return;
    // Registry schema defaults (never bare `{}`): the new row previews
    // and configures meaningfully before the first save.
    const id = tempId();
    dispatch({
      type: "addSection",
      section: {
        id,
        type,
        position: ordered.length + 1,
        enabled: true,
        settings: defaultSectionSettings(type),
        isNew: true,
      },
    });
    setModalOpen(false);
    setConfirmDeleteId(null);
    // Auto-expand + focus the fresh editor (Configure opens immediately).
    setFreshId(id);
    setExpandedId(id);
  }

  function toggleConfigure(id: string) {
    setExpandedId((prev) => {
      if (prev === id) {
        if (freshId === id) setFreshId(null);
        return null;
      }
      return id;
    });
  }

  function saveSettings(section: DraftSection, settings: Record<string, unknown>) {
    dispatch({ type: "setSectionSettings", id: section.id, settings });
  }

  function remove(sectionId: string) {
    if (confirmDeleteId !== sectionId) {
      setConfirmDeleteId(sectionId);
      return;
    }
    dispatch({ type: "deleteSection", id: sectionId });
    setConfirmDeleteId(null);
  }

  /* Native HTML5 drag-and-drop (handle-only, no library — ADR-052).
   * Touch devices keep the up/down buttons (no touch DnD in this API). */

  function onDragStart(sectionId: string, event: DragEvent<HTMLLIElement>) {
    const fromHandle = (event.target as HTMLElement | null)?.closest?.("[data-drag-handle]");
    if (!fromHandle) {
      event.preventDefault();
      return;
    }
    setDragId(sectionId);
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", sectionId);
    } catch {
      // setData unsupported — dragId state carries the payload instead.
    }
  }

  function onDragOver(index: number, event: DragEvent<HTMLLIElement>) {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function onDrop(index: number, event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    if (!dragId) {
      setDragId(null);
      setDropIndex(null);
      return;
    }
    const ids = ordered.map((s) => s.id);
    commitOrder(moveSectionId(ids, dragId, index));
    setDragId(null);
    setDropIndex(null);
  }

  function onDragEnd() {
    setDragId(null);
    setDropIndex(null);
  }

  function restoreDefaults() {
    if (!profileId || draft.dirty) return;
    setRestoreError(null);
    startRestoring(async () => {
      const result = await ensureSectionsAction(clientId, profileId);
      if (result.ok) {
        window.location.reload();
      } else {
        setRestoreError(result.message);
      }
    });
  }

  if (ordered.length === 0) {
    return (
      <section
        aria-label="Sections"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Sections</h2>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-muted">
            This profile has no sections yet. Restore the default set (hero, actions, links) —
            existing data is never modified.
          </p>
          {restoreError ? (
            <p className="text-sm font-medium text-red-700" role="alert">
              {restoreError}
            </p>
          ) : null}
          {draft.dirty ? (
            <p className="text-sm text-muted">
              Save or discard your unsaved changes first, then restore.
            </p>
          ) : (
            <div>
              <Button
                type="button"
                variant="primary"
                disabled={restoring}
                onClick={restoreDefaults}
              >
                {restoring ? "Restoring…" : "Restore default sections"}
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Sections"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-base font-semibold text-text">Sections</h2>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Content blocks and page order. Changes save with the profile draft. Hero always appears
          first on the public page.
        </p>
        <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add section
        </Button>
      </div>
      <ul
        ref={listRef}
        aria-label="Page order (drag to reorder, or use the move buttons)"
        className="mt-3 flex flex-col gap-2"
      >
        {ordered.map((section, index) => {
          const entry = catalogFor(section.type);
          const Icon = entry?.icon ?? LayoutTemplate;
          const foundation = isFoundationSectionType(section.type);
          const pinned = section.type === "hero";
          const droppingHere = dragId !== null && dropIndex === index;
          const beingDragged = dragId === section.id;
          const hint = foundation ? coreStepHint(section.type) : null;
          const expanded = expandedId === section.id;
          const saveError = saveState.sectionId === section.id ? saveState.error : null;
          return (
            <li
              key={section.id}
              ref={(el) => {
                if (el) itemRefs.current.set(section.id, el);
                else itemRefs.current.delete(section.id);
              }}
              data-section-id={section.id}
              draggable
              onDragStart={(e) => onDragStart(section.id, e)}
              onDragOver={(e) => onDragOver(index, e)}
              onDrop={(e) => onDrop(index, e)}
              onDragEnd={onDragEnd}
              aria-label={`${sectionLabel(section.type)}, position ${index + 1} of ${ordered.length}`}
              className={`rounded-xl border bg-white px-3.5 py-2.5 transition ${
                droppingHere ? "border-accent ring-2 ring-accent/30" : "border-border"
              } ${beingDragged ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                {!pinned ? (
                  <span
                    data-drag-handle
                    title="Drag to reorder (or use the move buttons)"
                    aria-hidden="true"
                    className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
                  >
                    <GripVertical className="h-5 w-5" />
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px] font-bold">
                    {sectionLabel(section.type)}
                    {section.isNew ? (
                      <span className="ml-2 font-normal text-muted">(unsaved)</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs font-medium text-muted">
                    {entry ? `${entry.category} · ` : ""}Position {section.position} ·{" "}
                    {section.enabled ? "Visible" : "Hidden"}
                    {pinned ? " · Always first" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pinned || index === 0}
                    onClick={() => move(section.id, -1)}
                    aria-label={`Move ${sectionLabel(section.type)} up`}
                    title={
                      pinned ? "Hero always appears first" : `Move ${sectionLabel(section.type)} up`
                    }
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pinned || index === ordered.length - 1}
                    onClick={() => move(section.id, 1)}
                    aria-label={`Move ${sectionLabel(section.type)} down`}
                    title={
                      pinned
                        ? "Hero always appears first"
                        : `Move ${sectionLabel(section.type)} down`
                    }
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={section.enabled ? "secondary" : "primary"}
                    onClick={() =>
                      dispatch({
                        type: "toggleSection",
                        id: section.id,
                        enabled: !section.enabled,
                      })
                    }
                    aria-label={`${section.enabled ? "Hide" : "Show"} ${sectionLabel(section.type)} on the public profile`}
                  >
                    {section.enabled ? "Hide" : "Show"}
                  </Button>
                </span>
              </div>
              {hint ? (
                <p className="mt-2 border-t border-border pt-2 text-[13px] text-muted">
                  {hint.label}.{" "}
                  <button
                    type="button"
                    onClick={() => setStep(hint.step)}
                    className="font-semibold text-accent hover:underline"
                  >
                    Go there
                  </button>
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => toggleConfigure(section.id)}
                      aria-expanded={expanded}
                      aria-controls={`configure-${section.id}`}
                      data-configure-button
                    >
                      <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                      {expanded ? "Collapse" : "Configure"}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </div>
                  {saveError ? (
                    <p role="alert" className="text-[13px] font-medium text-red-700">
                      {saveError}
                    </p>
                  ) : null}
                  {expanded ? (
                    <div id={`configure-${section.id}`} className="flex flex-col gap-2">
                      {entry?.presets && entry.presets.length > 0 ? (
                        <SectionPresetBar
                          typeLabel={sectionLabel(section.type)}
                          presets={entry.presets}
                          pending={false}
                          onApply={(_presetId, presetSettings) => {
                            saveSettings(section, {
                              ...(section.settings !== null && typeof section.settings === "object"
                                ? (section.settings as Record<string, unknown>)
                                : {}),
                              ...presetSettings,
                            });
                          }}
                        />
                      ) : null}
                      {entry?.settingsComponent ? (
                        <div className="px-1 pb-1">
                          <SectionSettingsRenderer
                            type={section.type}
                            settings={
                              section.settings !== null && typeof section.settings === "object"
                                ? (section.settings as Record<string, unknown>)
                                : {}
                            }
                            pending={false}
                            onSave={(next) => saveSettings(section, next)}
                            onChange={(next) => saveSettings(section, next)}
                            autoFocus={freshId === section.id}
                            context={{
                              clientId,
                              profileId,
                              sectionType: section.type,
                              resolveMapsLink: (url: string) => resolveMapsLinkAction(url),
                              uploadImage: async (file: File) => {
                                const formData = new FormData();
                                formData.set("file", file);
                                return uploadSectionImageAction(
                                  clientId,
                                  profileId,
                                  section.type,
                                  { ok: false, message: "" },
                                  formData,
                                );
                              },
                              uploadDocument: async (file: File) => {
                                const formData = new FormData();
                                formData.set("file", file);
                                return uploadDocumentAction(
                                  clientId,
                                  profileId,
                                  section.type,
                                  { ok: false, message: "" },
                                  formData,
                                );
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="px-2 pb-1 text-[13px] leading-snug text-muted">
                          Settings for {sectionLabel(section.type)} arrive with its implementation.
                          Nothing to configure yet.
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {foundation ? null : confirmDeleteId === section.id ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="button" variant="primary" onClick={() => remove(section.id)}>
                          Confirm remove
                        </Button>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => remove(section.id)}
                        aria-label={`Remove ${sectionLabel(section.type)} from this profile`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AddSectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        addedTypes={addedTypes}
        profileType={draft.fields.profile_type}
        pending={false}
        onAdd={add}
      />
    </section>
  );
}
