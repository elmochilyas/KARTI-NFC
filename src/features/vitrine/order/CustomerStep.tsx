/**
 * Wizard Step 2 — Customer details.
 *
 * No account creation. Separate WhatsApp field collapses into the phone
 * number when "same number" is enabled. EMAIL preferred contact makes
 * the email field required.
 */

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { VitrineDict } from "../i18n";
import { fieldMessage } from "./ConfigFields";
import type { CustomerForm, FieldErrors } from "./validate";

export function CustomerStep({
  dict,
  form,
  errors,
  onChange,
}: {
  dict: VitrineDict;
  form: CustomerForm;
  errors: FieldErrors;
  onChange: (patch: Partial<CustomerForm>) => void;
}) {
  const f = dict.order.fields;
  return (
    <div className="space-y-4">
      <Field
        id="order-fullName"
        label={f.fullName}
        required
        error={fieldMessage(dict, errors, "fullName")}
      >
        <Input
          id="order-fullName"
          value={form.fullName}
          invalid={!!errors.fullName}
          autoComplete="name"
          onChange={(e) => onChange({ fullName: e.target.value })}
        />
      </Field>
      <Field id="order-phone" label={f.phone} required error={fieldMessage(dict, errors, "phone")}>
        <Input
          id="order-phone"
          value={form.phone}
          invalid={!!errors.phone}
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 XX XX XX XX"
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </Field>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.sameWhatsapp}
          onChange={(e) => onChange({ sameWhatsapp: e.target.checked })}
        />
        {f.sameWhatsapp}
      </label>
      {!form.sameWhatsapp ? (
        <Field
          id="order-whatsapp"
          label={f.whatsapp}
          error={fieldMessage(dict, errors, "whatsapp")}
        >
          <Input
            id="order-whatsapp"
            value={form.whatsapp}
            invalid={!!errors.whatsapp}
            inputMode="tel"
            autoComplete="tel"
            onChange={(e) => onChange({ whatsapp: e.target.value })}
          />
        </Field>
      ) : null}
      <Field
        id="order-email"
        label={f.email}
        required={form.preferredContact === "EMAIL"}
        error={fieldMessage(dict, errors, "email")}
      >
        <Input
          id="order-email"
          value={form.email}
          invalid={!!errors.email}
          inputMode="email"
          autoComplete="email"
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </Field>
      <Field
        id="order-preferredContact"
        label={f.preferredContact}
        required
        error={fieldMessage(dict, errors, "preferredContact")}
      >
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={f.preferredContact}>
          {(
            [
              ["WHATSAPP", f.contactWhatsapp],
              ["PHONE", f.contactPhone],
              ["EMAIL", f.contactEmail],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="preferredContact"
                checked={form.preferredContact === value}
                onChange={() => onChange({ preferredContact: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
