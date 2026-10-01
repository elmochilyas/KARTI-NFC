"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CatalogFormState } from "@/app/dashboard/catalog/actions";

const INITIAL_STATE: CatalogFormState = {
  ok: false,
  error: { code: "", message: "" },
};

export type PricingFormValues = {
  published: boolean;
  pricingMode: string;
  priceMad: string;
  availability: string;
};

/**
 * GENERAL + PRICING editor section. Price is a decimal MAD string parsed
 * server-side into integer minor units (never float). FIXED/FROM require a
 * price; QUOTE forbids one. ProductType itself is not editable.
 */
export function PricingForm({
  action,
  initialValues,
}: {
  action: (prevState: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
  initialValues: PricingFormValues;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const preserved = state.values ?? null;
  const values: PricingFormValues = {
    published: preserved ? preserved.published === "on" : initialValues.published,
    pricingMode: preserved?.pricingMode ?? initialValues.pricingMode,
    priceMad: preserved?.priceMad ?? initialValues.priceMad,
    availability: preserved?.availability ?? initialValues.availability,
  };
  const message = state.ok === false && state.error.message !== "" ? state.error.message : null;
  const saved = state.ok === true;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {message}
        </p>
      ) : null}
      {saved ? (
        <p
          role="status"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text"
        >
          Saved. Public pages update immediately.
        </p>
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-text">
        <input
          type="checkbox"
          name="published"
          defaultChecked={values.published}
          className="h-5 w-5 accent-[var(--color-accent)]"
        />
        Published (uncheck to hide from listings, sitemap, and new orders)
      </label>
      <Field id="catalog-pricing-mode" label="Pricing mode" required>
        <Select name="pricingMode" defaultValue={values.pricingMode} required>
          <option value="QUOTE">QUOTE — request price / request quote</option>
          <option value="FIXED">FIXED — exact configured price</option>
          <option value="FROM">FROM — floor price, shown as “From X MAD”</option>
        </Select>
      </Field>
      <Field
        id="catalog-price-mad"
        label="Price in MAD"
        hint="Decimal MAD, e.g. 199 or 249.50. Stored as integer minor units. Leave empty for QUOTE."
      >
        <Input
          name="priceMad"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="199.00"
          defaultValue={values.priceMad}
        />
      </Field>
      <Field id="catalog-availability" label="Availability">
        <Select name="availability" defaultValue={values.availability}>
          <option value="">Not specified</option>
          <option value="IN_STOCK">In stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
          <option value="PREORDER">Pre-order</option>
        </Select>
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          Save general + pricing
        </Button>
      </div>
    </form>
  );
}
