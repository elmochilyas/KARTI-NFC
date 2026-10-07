/**
 * Wizard Step 3 — Delivery.
 *
 * No shipping provider, no invented fees or promises. The delivery
 * note states delivery is confirmed later by Karti.
 */

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { VitrineDict } from "../i18n";
import { fieldMessage } from "./ConfigFields";
import type { DeliveryForm, FieldErrors } from "./validate";

export function DeliveryStep({
  dict,
  form,
  errors,
  onChange,
}: {
  dict: VitrineDict;
  form: DeliveryForm;
  errors: FieldErrors;
  onChange: (patch: Partial<DeliveryForm>) => void;
}) {
  const f = dict.order.fields;
  return (
    <div className="space-y-4">
      <Field id="order-city" label={f.city} required error={fieldMessage(dict, errors, "city")}>
        <Input
          id="order-city"
          value={form.city}
          invalid={!!errors.city}
          autoComplete="address-level2"
          onChange={(e) => onChange({ city: e.target.value })}
        />
      </Field>
      <Field
        id="order-address"
        label={f.address}
        hint={f.addressHint}
        required
        error={fieldMessage(dict, errors, "address")}
      >
        <Textarea
          id="order-address"
          value={form.address}
          invalid={!!errors.address}
          autoComplete="street-address"
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </Field>
      <Field
        id="order-instructions"
        label={f.instructions}
        error={fieldMessage(dict, errors, "instructions")}
      >
        <Textarea
          id="order-instructions"
          value={form.instructions}
          invalid={!!errors.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
        />
      </Field>
      <p className="rounded-xl bg-neutral-muted p-4 text-sm text-muted">
        {dict.order.deliveryNote}
      </p>
    </div>
  );
}
