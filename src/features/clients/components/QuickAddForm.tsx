"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { quickAddAction, type ClientFormState } from "@/app/dashboard/clients/actions";

const INITIAL_STATE: ClientFormState = {
  ok: false,
  error: { code: "VALIDATION_ERROR", message: "" },
};

/**
 * Secondary shortcut: name + phone (+ company), same table, same validation.
 * Collapsed by default. The full New Client page remains the primary path.
 */
export function QuickAddForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(quickAddAction, INITIAL_STATE);
  const fieldErrors = state.ok === false ? state.error.fieldErrors : undefined;

  if (!open) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            In a hurry? <span className="font-medium text-text">Quick add</span> with just a name
            and phone — finish the rest later.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            aria-expanded="false"
            aria-controls="quick-add-form"
          >
            Quick add
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Quick add client"
      className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
    >
      <form id="quick-add-form" action={formAction} className="flex flex-col gap-4" noValidate>
        {state.ok === false && state.error.message ? (
          <p
            role="alert"
            className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
          >
            {state.error.message}
          </p>
        ) : null}
        <Field id="quick-name" label="Name" required error={fieldErrors?.name}>
          <Input
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Customer name"
            defaultValue={state.values?.name ?? ""}
            invalid={Boolean(fieldErrors?.name)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="quick-phone" label="Phone" error={fieldErrors?.phone}>
            <Input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+212 6 12 34 56 78"
              defaultValue={state.values?.phone ?? ""}
              invalid={Boolean(fieldErrors?.phone)}
            />
          </Field>
          <Field id="quick-company" label="Company (optional)" error={fieldErrors?.company}>
            <Input
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Company"
              defaultValue={state.values?.company ?? ""}
              invalid={Boolean(fieldErrors?.company)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>
            {pending ? "Adding…" : "Add client"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
