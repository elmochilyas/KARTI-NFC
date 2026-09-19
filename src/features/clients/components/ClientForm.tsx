"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ClientFormState } from "@/app/dashboard/clients/actions";

export type ClientFormValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
};

export const EMPTY_CLIENT_VALUES: ClientFormValues = {
  name: "",
  company: "",
  phone: "",
  email: "",
  notes: "",
};

const INITIAL_STATE: ClientFormState = {
  ok: false,
  error: { code: "VALIDATION_ERROR", message: "" },
};

type ClientFormProps = {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initialValues?: ClientFormValues;
  submitLabel: string;
  showNotes?: boolean;
};

/** Shared full client form: accessible labels, field errors, preserved values, pending state. */
export function ClientForm({
  action,
  initialValues = EMPTY_CLIENT_VALUES,
  submitLabel,
  showNotes = true,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const values = state.values ?? initialValues;
  const fieldErrors = state.ok === false ? state.error.fieldErrors : undefined;
  const formError =
    state.ok === false && state.error.code !== "VALIDATION_ERROR" ? state.error.message : null;

  const validationMessage =
    state.ok === false && state.error.code === "VALIDATION_ERROR" ? state.error.message : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {formError || validationMessage ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {formError ?? validationMessage}
        </p>
      ) : null}
      <Field id="client-name" label="Name" required error={fieldErrors?.name}>
        <Input
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Younes Barrag"
          defaultValue={values.name}
          invalid={Boolean(fieldErrors?.name)}
          required
        />
      </Field>
      <Field id="client-company" label="Company" error={fieldErrors?.company}>
        <Input
          name="company"
          type="text"
          autoComplete="organization"
          placeholder="Karti"
          defaultValue={values.company}
          invalid={Boolean(fieldErrors?.company)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="client-phone" label="Phone" error={fieldErrors?.phone}>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+212 6 12 34 56 78"
            defaultValue={values.phone}
            invalid={Boolean(fieldErrors?.phone)}
          />
        </Field>
        <Field id="client-email" label="Email" error={fieldErrors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={values.email}
            invalid={Boolean(fieldErrors?.email)}
          />
        </Field>
      </div>
      {showNotes ? (
        <Field
          id="client-notes"
          label="Notes"
          hint="Admin-only. Never shown on public pages."
          error={fieldErrors?.notes}
        >
          <Textarea
            name="notes"
            placeholder="How you met, preferences, follow-ups…"
            defaultValue={values.notes}
            invalid={Boolean(fieldErrors?.notes)}
          />
        </Field>
      ) : null}
      <div className="sm:max-w-60">
        <Button type="submit" loading={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
