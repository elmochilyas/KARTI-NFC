"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  addLinkAction,
  deleteLinkAction,
  reorderLinksAction,
  toggleLinkAction,
  updateLinkAction,
} from "@/app/dashboard/clients/[id]/profile/actions";
import { LINK_TYPE_LABELS, type LinkType, type ProfileLinkRow } from "@/features/profiles/types";

const EMPTY_STATE = { ok: false as const, message: "" };

function LinkFields({ prefix, defaults }: { prefix: string; defaults?: ProfileLinkRow }) {
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

/** Read uncontrolled link inputs without a <form> (this manager lives inside the save form). */
function readLinkFields(root: HTMLElement | null): FormData {
  const formData = new FormData();
  const get = (name: string) =>
    (root?.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)
      ?.value ?? "";
  formData.set("type", get("type"));
  formData.set("label", get("label"));
  formData.set("url", get("url"));
  return formData;
}

function AddLinkForm({ clientId, profileId }: { clientId: string; profileId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
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
    const formData = readLinkFields(containerRef.current);
    if (!formData.get("label") || !formData.get("url")) {
      setError("Label and URL are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addLinkAction(clientId, profileId, EMPTY_STATE, formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(
          result.fieldErrors?.url
            ? `${result.message} (${result.fieldErrors.url})`
            : result.message,
        );
      }
    });
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
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "Adding…" : "Add link"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EditLinkFields({
  link,
  pending,
  onSave,
}: {
  link: ProfileLinkRow;
  pending: boolean;
  onSave: (formData: FormData) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={containerRef} className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
      <LinkFields prefix={`link-${link.id}`} defaults={link} />
      <div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => onSave(readLinkFields(containerRef.current))}
        >
          {pending ? "Saving…" : "Save link"}
        </Button>
      </div>
    </div>
  );
}

function LinkRow({
  link,
  clientId,
  profileId,
  isFirst,
  isLast,
  onMove,
  moving,
}: {
  link: ProfileLinkRow;
  clientId: string;
  profileId: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (linkId: string, direction: -1 | 1) => void;
  moving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(
    operation: () => Promise<{ ok: boolean; message?: string }>,
    onSuccess?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {link.label}
            {!link.enabled ? <span className="ml-2 font-normal text-muted">(disabled)</span> : null}
          </p>
          <p className="truncate text-sm text-muted" title={link.url}>
            {LINK_TYPE_LABELS[link.type as LinkType] ?? link.type} · {link.url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst || moving}
            onClick={() => onMove(link.id, -1)}
            aria-label={`Move ${link.label} up`}
            title="Move up"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isLast || moving}
            onClick={() => onMove(link.id, 1)}
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
          disabled={pending}
          onClick={() => run(() => toggleLinkAction(clientId, profileId, link.id, !link.enabled))}
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
              disabled={pending}
              onClick={() => run(() => deleteLinkAction(clientId, profileId, link.id))}
              className="inline-flex min-h-9 items-center justify-center rounded-md bg-danger px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
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
        <EditLinkFields
          link={link}
          pending={pending}
          onSave={(formData) =>
            run(
              () => updateLinkAction(clientId, profileId, link.id, EMPTY_STATE, formData),
              () => setEditing(false),
            )
          }
        />
      ) : null}
    </li>
  );
}

export function LinksManager({
  clientId,
  profileId,
  links,
}: {
  clientId: string;
  profileId: string | null;
  links: ProfileLinkRow[];
}) {
  const [moving, startMoving] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);
  const router = useRouter();

  if (!profileId) {
    return <p className="text-sm text-muted">Save the profile first, then add links here.</p>;
  }

  const pid: string = profileId;

  function handleMove(linkId: string, direction: -1 | 1) {
    const index = links.findIndex((l) => l.id === linkId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= links.length) return;
    const orderedIds: string[] = links.map((l) => l.id);
    const [moved] = orderedIds.splice(index, 1);
    if (moved === undefined) return;
    orderedIds.splice(target, 0, moved);
    setMoveError(null);
    startMoving(async () => {
      const result = await reorderLinksAction(clientId, pid, orderedIds);
      if (!result.ok) setMoveError(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {links.length === 0 ? (
        <p className="text-sm text-muted">No links yet. Add Instagram, reviews, booking…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link, i) => (
            <LinkRow
              key={link.id}
              link={link}
              clientId={clientId}
              profileId={pid}
              isFirst={i === 0}
              isLast={i === links.length - 1}
              onMove={handleMove}
              moving={moving}
            />
          ))}
        </ul>
      )}
      {moveError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {moveError}
        </p>
      ) : null}
      <div>
        <AddLinkForm clientId={clientId} profileId={pid} />
      </div>
    </div>
  );
}
