"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  catalogEntriesByCategory,
  type SectionCatalogEntry,
} from "@/features/profiles/sectionCatalog";

function audienceName(profile: string): string {
  if (profile === "BUSINESS") return "Business";
  if (profile === "PERSON") return "Personal";
  return "Restaurant";
}

function audienceLabel(profiles: string[]): string {
  if (profiles.length === 1) return `${audienceName(profiles[0])} only`;
  return `${profiles.map(audienceName).join(" & ")} only`;
}

function CatalogRow({
  entry,
  added,
  compatible,
  pending,
  onAdd,
}: {
  entry: SectionCatalogEntry;
  added: boolean;
  compatible: boolean;
  pending: boolean;
  onAdd: (type: string) => void;
}) {
  const Icon = entry.icon;
  const comingSoon = entry.status === "planned";
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-bold">{entry.label}</span>
        <span className="block truncate text-xs font-medium text-muted">{entry.description}</span>
      </span>
      {!compatible ? (
        <span
          className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-surface-muted px-3.5 text-[13px] font-bold text-muted"
          title={`Only available for ${entry.supportedProfiles.join(" and ").toLowerCase()} profiles`}
        >
          {audienceLabel(entry.supportedProfiles)}
        </span>
      ) : comingSoon ? (
        <span
          className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-surface-muted px-3.5 text-[13px] font-bold text-muted"
          title="Available in a later phase"
        >
          Coming soon
        </span>
      ) : added ? (
        <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3.5 text-[13px] font-bold text-text">
          <Check aria-hidden="true" className="h-4 w-4" />
          Added
        </span>
      ) : (
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() => onAdd(entry.type)}
          aria-label={`Add ${entry.label} to this profile`}
        >
          Add
        </Button>
      )}
      <span className="sr-only">{added ? "already on this profile" : entry.status}</span>
    </li>
  );
}

/**
 * Phase 26 section catalog browser. List-only in this phase: planned types
 * are shown as Coming soon (no persistence until each section ships its
 * implementation), live core types show as already added. Native `<dialog>`
 * (top-layer, Esc-to-close, no dependency) following the ImageCropEditor
 * pattern.
 */
export function AddSectionModal({
  open,
  onClose,
  addedTypes,
  profileType,
  pending,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  addedTypes: Set<string>;
  profileType: string;
  pending: boolean;
  onAdd: (type: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // showModal unsupported — the dialog still renders inline.
      }
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onDialogCancel = () => onCloseRef.current();
    dialog.addEventListener("cancel", onDialogCancel);
    return () => {
      dialog.removeEventListener("cancel", onDialogCancel);
      if (dialog.open) dialog.close();
    };
  }, []);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Add a section"
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 shadow-[0_40px_100px_-32px_rgba(15,35,60,0.4)] backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <h2 className="text-base font-semibold text-text">Add a section</h2>
          <p className="mt-1 text-sm text-muted">
            New blocks unlock here as they ship. Core blocks are already on every profile.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex max-h-[60dvh] flex-col gap-5 overflow-y-auto p-5">
        {catalogEntriesByCategory().map((group) => (
          <section key={group.category} aria-label={`${group.category} sections`}>
            <h3 className="px-1 text-xs font-bold tracking-[0.18em] text-muted uppercase">
              {group.category}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {group.entries.map((entry) => (
                <CatalogRow
                  key={entry.type}
                  entry={entry}
                  added={addedTypes.has(entry.type)}
                  compatible={(entry.supportedProfiles as string[]).includes(profileType)}
                  pending={pending}
                  onAdd={onAdd}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}
