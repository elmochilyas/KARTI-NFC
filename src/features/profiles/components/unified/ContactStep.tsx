"use client";

import { ArrowDown, ArrowUp, Check, GripVertical, Plus, X } from "lucide-react";
import {
  BUILTIN_ACTION_IDS,
  clampPrimaryLimit,
  parsePrimaryRef,
  primaryAvailability,
  readPrimaryRefs,
  type BuiltinActionId,
} from "@/components/public-profile/brandIcons";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { getCatalogEntry } from "@/features/profiles/sectionCatalog";
import { LINK_TYPE_LABELS, type LinkType } from "@/features/profiles/types";
import {
  draftSectionId,
  type DraftFields,
  type EditorDraft,
} from "@/features/profiles/unifiedDraft";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { SectionPresetBar } from "../SectionPresetBar";
import { SectionSettingsRenderer } from "../section-settings/SectionSettingsRenderer";

const BUILTIN_LABELS: Record<BuiltinActionId, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  website: "Website",
};

const BUILTIN_MISSING_COPY: Record<BuiltinActionId, string> = {
  call: "Add a phone number to enable",
  whatsapp: "Add a WhatsApp number to enable",
  email: "Add an email address to enable",
  website: "Add a website to enable",
};

function linkRef(linkId: string): string {
  return `link:${linkId}`;
}

function draftContactInput(draft: EditorDraft) {
  return {
    phone: draft.fields.phone.trim() || null,
    whatsapp: draft.fields.whatsapp.trim() || null,
    email: draft.fields.email.trim() || null,
    website: draft.fields.website.trim() || null,
    links: draft.links,
  };
}

function refLabel(ref: string, draft: EditorDraft): { label: string; caption: string } | null {
  if (ref.startsWith("link:draft-")) {
    const link = draft.links.find((l) => linkRef(l.id) === ref);
    if (!link) return null;
    return {
      label: link.label.trim() === "" ? "Untitled link" : link.label,
      caption: LINK_TYPE_LABELS[link.type as LinkType] ?? link.type,
    };
  }
  const parsed = parsePrimaryRef(ref);
  if (!parsed) return null;
  if (parsed.kind === "builtin") return { label: BUILTIN_LABELS[parsed.id], caption: "Contact" };
  const link = draft.links.find((l) => l.id.toLowerCase() === parsed.id);
  if (!link) return null;
  return {
    label: link.label.trim() === "" ? "Untitled link" : link.label,
    caption: LINK_TYPE_LABELS[link.type as LinkType] ?? link.type,
  };
}

/**
 * Phase 34 — Step 2 Contact. Contact data AND action configuration live
 * here together: the explicit primary-action arrangement, the tiles/buttons
 * preset, the visibility toggles, and the top-actions count.
 */
export function ContactStep() {
  const { draft, dispatch, saveState } = useUnifiedEditor();
  const fieldErrors = saveState.fieldErrors;

  function set(field: keyof DraftFields, value: string) {
    dispatch({ type: "setField", field, value });
  }

  const actionsId = draftSectionId(draft, "actions");
  const actionsRow = draft.sections.find((s) => s.type === "actions") ?? null;
  const actionsSettings = actionsRow?.settings ?? {};
  const maxQuick = clampPrimaryLimit(actionsSettings.maxQuickActions);

  function saveActionsSettings(next: Record<string, unknown>) {
    if (!actionsId) return;
    dispatch({ type: "setSectionSettings", id: actionsId, settings: next });
  }

  const refs = readPrimaryRefs(actionsSettings.primaryActions, true);
  const availability = primaryAvailability(draftContactInput(draft));
  const refSet = new Set(refs);

  function setRefs(next: string[]) {
    saveActionsSettings({ ...actionsSettings, primaryActions: next });
  }

  function moveRef(ref: string, direction: -1 | 1) {
    const from = refs.indexOf(ref);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= refs.length) return;
    const next = [...refs];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) return;
    next.splice(to, 0, moved);
    setRefs(next);
  }

  type Candidate = { ref: string; label: string; caption: string; available: boolean };

  // Explicit order first (visible), then every other available candidate.
  // Removing a primary never deletes the underlying contact value or link.
  const visible: Candidate[] = [];
  for (const ref of refs) {
    const resolved = refLabel(ref, draft);
    if (!resolved) continue;
    visible.push({ ref, ...resolved, available: true });
  }
  const hidden: Candidate[] = [];
  for (const id of BUILTIN_ACTION_IDS) {
    if (refSet.has(id)) continue;
    if (availability[id])
      hidden.push({ ref: id, label: BUILTIN_LABELS[id], caption: "Contact", available: true });
  }
  for (const link of draft.links) {
    // Temp ids stay verbatim (remapped on save); uuids compare lowercased.
    const canonical = link.id.startsWith("draft-")
      ? linkRef(link.id)
      : linkRef(link.id.toLowerCase());
    if (refSet.has(canonical)) continue;
    if (!link.enabled) continue;
    if (link.label.trim() === "" || link.url.trim() === "") continue;
    hidden.push({
      ref: canonical,
      label: link.label,
      caption: LINK_TYPE_LABELS[link.type as LinkType] ?? link.type,
      available: true,
    });
  }
  const unavailable = BUILTIN_ACTION_IDS.filter((id) => !availability[id] && !refSet.has(id));

  const actionsPresets = getCatalogEntry("actions")?.presets ?? [];

  return (
    <section
      aria-label="Contact"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-base font-semibold text-text">Contact & location</h2>
      <p className="mt-1 text-sm text-muted">Only filled fields appear on the public page.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="profile-phone" label="Phone" error={fieldErrors?.phone}>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            value={draft.fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            invalid={Boolean(fieldErrors?.phone)}
          />
        </Field>
        <Field id="profile-whatsapp" label="WhatsApp" error={fieldErrors?.whatsapp}>
          <Input
            name="whatsapp"
            type="tel"
            value={draft.fields.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            invalid={Boolean(fieldErrors?.whatsapp)}
          />
        </Field>
        <Field id="profile-email" label="Email" error={fieldErrors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={draft.fields.email}
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
            value={draft.fields.website}
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
              value={draft.fields.address}
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
              value={draft.fields.maps_url}
              onChange={(e) => set("maps_url", e.target.value)}
              invalid={Boolean(fieldErrors?.maps_url)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text">Primary actions</h3>
        <p className="mt-1 text-sm text-muted">
          Choose which actions visitors see first. Removing one here never deletes the contact
          detail or link behind it.
        </p>
        {actionsRow && actionsId ? (
          <div className="mt-3 flex flex-col gap-3">
            {visible.length === 0 ? (
              <p className="text-sm text-muted">
                No explicit order — visitors see the default order. Feature actions below to arrange
                them.
              </p>
            ) : (
              <ol className="flex flex-col gap-1.5" aria-label="Primary actions in order">
                {visible.map((item, i) => (
                  <li
                    key={item.ref}
                    className="flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-2"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-7 shrink-0 items-center justify-center text-muted"
                    >
                      <GripVertical className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[15px] font-bold text-text">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs font-medium text-muted">
                        {item.caption} · Visible
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveRef(item.ref, -1)}
                        aria-label={`Move ${item.label} up`}
                        title="Move up"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30"
                      >
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={i === visible.length - 1}
                        onClick={() => moveRef(item.ref, 1)}
                        aria-label={`Move ${item.label} down`}
                        title="Move down"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30"
                      >
                        <ArrowDown aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefs(refs.filter((r) => r !== item.ref))}
                        aria-label={`Remove ${item.label} from primary actions`}
                        title="Remove from primary"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-danger-muted hover:text-danger"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {hidden.length > 0 ? (
              <ul className="flex flex-col gap-1.5" aria-label="More actions you can feature">
                {hidden.map((item) => (
                  <li
                    key={item.ref}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-border px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1 pl-9 text-left">
                      <span className="block truncate text-sm font-medium text-muted">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-muted">{item.caption}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRefs([...refs, item.ref])}
                      aria-label={`Feature ${item.label} as a primary action`}
                      title="Feature as primary"
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-accent hover:bg-surface-muted"
                    >
                      <Plus aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {unavailable.length > 0 ? (
              <p className="text-[13px] text-muted">
                {unavailable.map((id) => BUILTIN_MISSING_COPY[id]).join(" · ")}
              </p>
            ) : null}
            <div>
              <p id="max-quick-label" className="text-sm font-medium text-text">
                Show first
              </p>
              <div role="group" aria-labelledby="max-quick-label" className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => saveActionsSettings({ ...actionsSettings, maxQuickActions: n })}
                    aria-pressed={maxQuick === n}
                    aria-label={`Show first ${n} action${n === 1 ? "" : "s"}`}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-sm font-bold transition-colors ${
                      maxQuick === n
                        ? "border-accent bg-accent text-accent-contrast"
                        : "border-border text-muted hover:text-text"
                    }`}
                  >
                    {maxQuick === n ? (
                      <span className="inline-flex items-center gap-1">
                        <Check aria-hidden="true" className="h-4 w-4" />
                        {n}
                      </span>
                    ) : (
                      n
                    )}
                  </button>
                ))}
              </div>
            </div>
            <SectionPresetBar
              typeLabel="Quick actions"
              presets={actionsPresets}
              pending={false}
              onApply={(_presetId, presetSettings) =>
                saveActionsSettings({ ...actionsSettings, ...presetSettings })
              }
            />
            <details>
              <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-muted hover:text-text">
                Visibility settings
              </summary>
              <div className="mt-2 px-1 pb-1">
                <SectionSettingsRenderer
                  type="actions"
                  settings={actionsSettings}
                  pending={false}
                  onSave={saveActionsSettings}
                  onChange={saveActionsSettings}
                />
              </div>
            </details>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Save the profile once to configure primary actions.
          </p>
        )}
      </div>
    </section>
  );
}
