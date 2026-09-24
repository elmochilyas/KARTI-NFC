"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { linkSchema } from "@/features/profiles/links";
import { LINK_TYPE_LABELS, type LinkType } from "@/features/profiles/types";
import { draftSectionId } from "@/features/profiles/unifiedDraft";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { SectionSettingsRenderer } from "../section-settings/SectionSettingsRenderer";

/**
 * Phase 34 — Step 3 Links. The complete link manager, draft-first: every
 * add/edit/delete/enable/reorder updates the shared draft instantly (live
 * preview included) and persists with the unified Save. Validation mirrors
 * the server schema so feedback is immediate; the save revalidates anyway.
 */

function validateLink(input: { type: string; label: string; url: string }): string | null {
  const parsed = linkSchema.safeParse({ ...input, icon: "" });
  if (parsed.success) return null;
  const first = parsed.error.issues[0];
  return first ? `${first.path[0] as string}: ${first.message}` : "Check the link fields.";
}

function LinkFields({
  prefix,
  defaults,
}: {
  prefix: string;
  defaults?: { type: string; label: string; url: string };
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-type`} label="Type">
          <Select name="type" defaultValue={defaults?.type ?? "instagram"}>
            {(Object.keys(LINK_TYPE_LABELS) as LinkType[]).map((type) => (
              <option key={type} value={type}>
                {LINK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${prefix}-label`} label="Label">
          <Input
            name="label"
            type="text"
            placeholder="Instagram"
            defaultValue={defaults?.label ?? ""}
            required
          />
        </Field>
      </div>
      <Field id={`${prefix}-url`} label="URL">
        <Input
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/…"
          defaultValue={defaults?.url ?? ""}
          required
        />
      </Field>
    </>
  );
}

/** Read uncontrolled link inputs without a <form> (we live inside the save form). */
function readLinkFields(root: HTMLElement | null): { type: string; label: string; url: string } {
  const get = (name: string) =>
    (root?.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)
      ?.value ?? "";
  return { type: get("type"), label: get("label"), url: get("url") };
}

function AddLinkForm() {
  const { dispatch, tempId } = useUnifiedEditor();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Link
      </Button>
    );
  }

  function submit() {
    const input = readLinkFields(containerRef.current);
    const problem = validateLink(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    dispatch({
      type: "addLink",
      link: {
        id: tempId(),
        type: input.type,
        label: input.label.trim(),
        url: input.url.trim(),
        icon: null,
        enabled: true,
        sort_order: 0,
        isNew: true,
      },
    });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <LinkFields prefix="new-link" />
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" onClick={submit}>
          Add link
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function LinkRow({
  linkId,
  isFirst,
  isLast,
}: {
  linkId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { draft, dispatch } = useUnifiedEditor();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const link = draft.links.find((l) => l.id === linkId);

  if (!link) return null;

  function saveEdit() {
    const target = draft.links.find((l) => l.id === linkId);
    if (!target) {
      setError("This link is no longer here.");
      return;
    }
    const input = readLinkFields(containerRef.current);
    const problem = validateLink(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    dispatch({
      type: "updateLink",
      id: target.id,
      patch: { type: input.type, label: input.label.trim(), url: input.url.trim() },
    });
    setEditing(false);
  }

  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {link.label}
            {!link.enabled ? <span className="ml-2 font-normal text-muted">(disabled)</span> : null}
            {link.isNew ? <span className="ml-2 font-normal text-muted">(unsaved)</span> : null}
          </p>
          <p className="truncate text-sm text-muted" title={link.url}>
            {LINK_TYPE_LABELS[link.type as LinkType] ?? link.type} · {link.url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => dispatch({ type: "moveLink", id: link.id, direction: -1 })}
            aria-label={`Move ${link.label} up`}
            title="Move up"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => dispatch({ type: "moveLink", id: link.id, direction: 1 })}
            aria-label={`Move ${link.label} down`}
            title="Move down"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30"
          >
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => dispatch({ type: "toggleLink", id: link.id, enabled: !link.enabled })}
          aria-pressed={link.enabled}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-muted disabled:opacity-50"
        >
          {link.enabled ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setConfirmingDelete(false);
          }}
          aria-expanded={editing}
          className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium text-muted hover:bg-surface-muted hover:text-text"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          {editing ? "Close" : "Edit"}
        </button>
        {confirmingDelete ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "deleteLink", id: link.id })}
              className="inline-flex min-h-9 items-center justify-center rounded-md bg-danger px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted hover:text-text"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(true);
              setEditing(false);
            }}
            aria-label={`Delete ${link.label}`}
            title="Delete"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted hover:bg-danger-muted hover:text-danger"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {editing ? (
        <div ref={containerRef} className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
          <LinkFields
            prefix={`link-${link.id}`}
            defaults={{ type: link.type, label: link.label, url: link.url }}
          />
          <div>
            <Button type="button" size="sm" onClick={saveEdit}>
              Save link
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function LinksStep() {
  const { draft, dispatch, profileId } = useUnifiedEditor();

  if (!profileId) {
    return (
      <section
        aria-label="Links"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Links</h2>
        <p className="mt-2 text-sm text-muted">Save the profile first, then add links here.</p>
      </section>
    );
  }

  const linksRowId = draftSectionId(draft, "links");
  const linksSettings = draft.sections.find((s) => s.type === "links")?.settings ?? {};

  return (
    <section
      aria-label="Links"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-base font-semibold text-text">Links</h2>
      <p className="mt-1 text-sm text-muted">
        Social and action links. Reorder with the arrow buttons — the public page follows this
        order. Changes save with the profile draft.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {draft.links.length === 0 ? (
          <p className="text-sm text-muted">No links yet. Add Instagram, reviews, booking…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {draft.links.map((link, i) => (
              <LinkRow
                key={link.id}
                linkId={link.id}
                isFirst={i === 0}
                isLast={i === draft.links.length - 1}
              />
            ))}
          </ul>
        )}
        <div>
          <AddLinkForm />
        </div>
        {linksRowId ? (
          <details>
            <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-muted hover:text-text">
              Link display settings
            </summary>
            <div className="mt-2 px-1 pb-1">
              <SectionSettingsRenderer
                type="links"
                settings={linksSettings}
                pending={false}
                onSave={(next) =>
                  dispatch({ type: "setSectionSettings", id: linksRowId, settings: next })
                }
                onChange={(next) =>
                  dispatch({ type: "setSectionSettings", id: linksRowId, settings: next })
                }
              />
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
