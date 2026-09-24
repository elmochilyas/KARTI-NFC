"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateTemplateAction } from "@/app/dashboard/clients/[id]/profile/actions";
import { compatibleTemplates } from "@/features/profiles/profileTemplates";

/**
 * Template metadata switcher (Phase 30). Changes ONLY the profile's
 * template reference — existing sections are never created, modified, or
 * deleted by this control (the service issues no profile_sections query).
 */
export function TemplateSwitcher({
  clientId,
  profileId,
  profileType,
  currentTemplate,
}: {
  clientId: string;
  profileId: string;
  profileType: string;
  currentTemplate: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const options = compatibleTemplates(profileType);
  const [selected, setSelected] = useState<string>(() =>
    options.some((t) => t.id === currentTemplate)
      ? (currentTemplate as string)
      : (options[0]?.id ?? ""),
  );

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTemplateAction(clientId, profileId, selected);
      if (result.ok) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        Reference only — changing the template never adds, removes, or edits sections.
      </p>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-green-700" role="status">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="profile-template-select" className="sr-only">
          Profile template
        </label>
        <select
          id="profile-template-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending}
          className="min-h-11 flex-1 rounded-md border border-border bg-surface px-3 text-base text-text"
        >
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.description}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="primary"
          disabled={pending || selected === currentTemplate}
          onClick={save}
        >
          {pending ? "Saving…" : "Save template"}
        </Button>
      </div>
    </div>
  );
}
