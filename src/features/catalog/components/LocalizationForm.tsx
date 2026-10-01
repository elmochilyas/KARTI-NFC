"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { CatalogFormState } from "@/app/dashboard/catalog/actions";
import type { CatalogLocalizationRow } from "../types";

const INITIAL_STATE: CatalogFormState = {
  ok: false,
  error: { code: "", message: "" },
};

function joinLines(items: string[]): string {
  return items.join("\n");
}

function joinFaqs(items: { q: string; a: string }[]): string {
  return items.map((item) => `${item.q} || ${item.a}`).join("\n");
}

/**
 * CONTENT + SEO editor for one locale. List fields are one item per line;
 * FAQs are one per line as `Question || Answer`. No HTML allowed.
 */
export function LocalizationForm({
  locale,
  row,
  action,
}: {
  locale: string;
  row: CatalogLocalizationRow | null;
  action: (prevState: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
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
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`catalog-${locale}-display`} label="Display name">
          <Input name="displayName" type="text" defaultValue={row?.display_name ?? ""} />
        </Field>
        <Field id={`catalog-${locale}-short`} label="Short name">
          <Input name="shortName" type="text" defaultValue={row?.short_name ?? ""} />
        </Field>
      </div>
      <Field id={`catalog-${locale}-hero-title`} label="Hero title">
        <Input name="heroTitle" type="text" defaultValue={row?.hero_title ?? ""} />
      </Field>
      <Field id={`catalog-${locale}-hero-desc`} label="Hero description">
        <Textarea name="heroDescription" rows={3} defaultValue={row?.hero_description ?? ""} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`catalog-${locale}-short-desc`} label="Short description">
          <Textarea name="shortDescription" rows={2} defaultValue={row?.short_description ?? ""} />
        </Field>
        <Field id={`catalog-${locale}-outcome`} label="Outcome text">
          <Textarea name="outcomeText" rows={2} defaultValue={row?.outcome_text ?? ""} />
        </Field>
      </div>
      <Field
        id={`catalog-${locale}-pricing-note`}
        label="Pricing note"
        hint="Shown next to the price, e.g. delivery terms."
      >
        <Input name="pricingNote" type="text" defaultValue={row?.pricing_note ?? ""} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`catalog-${locale}-audiences`} label="Audiences" hint="One per line, max 12.">
          <Textarea name="audiences" rows={3} defaultValue={row ? joinLines(row.audiences) : ""} />
        </Field>
        <Field id={`catalog-${locale}-benefits`} label="Benefits" hint="One per line, max 12.">
          <Textarea name="benefits" rows={3} defaultValue={row ? joinLines(row.benefits) : ""} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`catalog-${locale}-usecases`} label="Use cases" hint="One per line, max 12.">
          <Textarea name="useCases" rows={3} defaultValue={row ? joinLines(row.use_cases) : ""} />
        </Field>
        <Field
          id={`catalog-${locale}-included`}
          label="Included items"
          hint="One per line, max 20."
        >
          <Textarea name="included" rows={3} defaultValue={row ? joinLines(row.included) : ""} />
        </Field>
      </div>
      <Field
        id={`catalog-${locale}-faqs`}
        label="FAQs"
        hint="One per line as “Question || Answer”, max 20."
      >
        <Textarea name="faqs" rows={4} defaultValue={row ? joinFaqs(row.faqs) : ""} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`catalog-${locale}-seo-title`} label="SEO title">
          <Input name="seoTitle" type="text" defaultValue={row?.seo_title ?? ""} />
        </Field>
        <Field id={`catalog-${locale}-seo-desc`} label="SEO description">
          <Textarea name="seoDescription" rows={2} defaultValue={row?.seo_description ?? ""} />
        </Field>
      </div>
      <div>
        <Button type="submit" loading={pending}>
          Save {locale.toUpperCase()} content
        </Button>
      </div>
    </form>
  );
}
