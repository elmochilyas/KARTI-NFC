/**
 * Per-product configuration fields (Step 1).
 *
 * Mirrors Phase 1 Zod schemas field-for-field; client validation is UX
 * only, the server revalidates authoritatively. All inputs carry real
 * <label>s (never placeholder-only).
 */

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict } from "../i18n";
import type { FieldErrors, ValidationKey } from "./validate";

export function fieldMessage(
  dict: VitrineDict,
  errors: FieldErrors,
  field: string,
): string | undefined {
  const key: ValidationKey | undefined = errors[field];
  if (!key) return undefined;
  return dict.order.validation[key];
}

function fieldId(name: string): string {
  return `order-${name}`;
}

export function ConfigFields({
  dict,
  product,
  config,
  errors,
  onChange,
}: {
  dict: VitrineDict;
  product: ProductType;
  config: Record<string, unknown>;
  errors: FieldErrors;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const f = dict.order.fields;
  const str = (key: string): string =>
    typeof config[key] === "string" ? (config[key] as string) : "";

  switch (product) {
    case "PERSONAL_CARD":
      return (
        <>
          <Field
            id={fieldId("fullName")}
            label={f.fullName}
            required
            error={fieldMessage(dict, errors, "fullName")}
          >
            <Input
              id={fieldId("fullName")}
              value={str("fullName")}
              invalid={!!errors.fullName}
              autoComplete="name"
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("professionalTitle")}
            label={f.professionalTitle}
            error={fieldMessage(dict, errors, "professionalTitle")}
          >
            <Input
              id={fieldId("professionalTitle")}
              value={str("professionalTitle")}
              invalid={!!errors.professionalTitle}
              autoComplete="organization-title"
              onChange={(e) => onChange({ professionalTitle: e.target.value })}
            />
          </Field>
        </>
      );
    case "CAREER_CARD":
      return (
        <>
          <Field
            id={fieldId("fullName")}
            label={f.fullName}
            required
            error={fieldMessage(dict, errors, "fullName")}
          >
            <Input
              id={fieldId("fullName")}
              value={str("fullName")}
              invalid={!!errors.fullName}
              autoComplete="name"
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("professionalTitle")}
            label={f.professionalTitle}
            error={fieldMessage(dict, errors, "professionalTitle")}
          >
            <Input
              id={fieldId("professionalTitle")}
              value={str("professionalTitle")}
              invalid={!!errors.professionalTitle}
              onChange={(e) => onChange({ professionalTitle: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("fieldOfStudyOrWork")}
            label={f.fieldOfStudyOrWork}
            error={fieldMessage(dict, errors, "fieldOfStudyOrWork")}
          >
            <Input
              id={fieldId("fieldOfStudyOrWork")}
              value={str("fieldOfStudyOrWork")}
              invalid={!!errors.fieldOfStudyOrWork}
              onChange={(e) => onChange({ fieldOfStudyOrWork: e.target.value })}
            />
          </Field>
          <fieldset>
            <legend className="mb-1 block text-sm font-medium">
              {f.hasCv} <span aria-hidden="true">*</span>
            </legend>
            <div className="flex gap-4">
              {([true, false] as const).map((value) => (
                <label key={String(value)} className="inline-flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="hasCv"
                    checked={config.hasCv === value}
                    onChange={() => onChange({ hasCv: value })}
                  />
                  {value ? f.yes : f.no}
                </label>
              ))}
            </div>
            {errors.hasCv ? (
              <p role="alert" className="mt-1 text-sm text-danger">
                {dict.order.validation.required}
              </p>
            ) : null}
          </fieldset>
        </>
      );
    case "BUSINESS_CARD":
      return (
        <>
          <Field
            id={fieldId("businessName")}
            label={f.businessName}
            required
            error={fieldMessage(dict, errors, "businessName")}
          >
            <Input
              id={fieldId("businessName")}
              value={str("businessName")}
              invalid={!!errors.businessName}
              autoComplete="organization"
              onChange={(e) => onChange({ businessName: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("businessCategory")}
            label={f.businessCategory}
            error={fieldMessage(dict, errors, "businessCategory")}
          >
            <Input
              id={fieldId("businessCategory")}
              value={str("businessCategory")}
              invalid={!!errors.businessCategory}
              onChange={(e) => onChange({ businessCategory: e.target.value })}
            />
          </Field>
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.hasLogo === true}
              onChange={(e) => onChange({ hasLogo: e.target.checked })}
            />
            {f.hasLogo}
          </label>
        </>
      );
    case "GOOGLE_REVIEW_CARD": {
      const needsHelp = config.needsUrlHelp === true;
      return (
        <>
          <Field
            id={fieldId("businessName")}
            label={f.businessName}
            required
            error={fieldMessage(dict, errors, "businessName")}
          >
            <Input
              id={fieldId("businessName")}
              value={str("businessName")}
              invalid={!!errors.businessName}
              autoComplete="organization"
              onChange={(e) => onChange({ businessName: e.target.value })}
            />
          </Field>
          <label className="inline-flex min-h-11 items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={needsHelp}
              onChange={(e) => onChange({ needsUrlHelp: e.target.checked, reviewUrl: undefined })}
            />
            {f.needsUrlHelpOption}
          </label>
          {needsHelp ? (
            <p className="text-sm text-muted">{f.reviewHelpNote}</p>
          ) : (
            <Field
              id={fieldId("reviewUrl")}
              label={f.reviewUrl}
              required
              error={fieldMessage(dict, errors, "reviewUrl")}
            >
              <Input
                id={fieldId("reviewUrl")}
                value={str("reviewUrl")}
                invalid={!!errors.reviewUrl}
                inputMode="url"
                autoComplete="url"
                placeholder="https://"
                onChange={(e) => onChange({ reviewUrl: e.target.value })}
              />
            </Field>
          )}
        </>
      );
    }
    case "WHATSAPP_CARD":
      return (
        <>
          <Field
            id={fieldId("whatsappNumber")}
            label={f.whatsappNumber}
            required
            error={fieldMessage(dict, errors, "whatsappNumber")}
          >
            <Input
              id={fieldId("whatsappNumber")}
              value={str("whatsappNumber")}
              invalid={!!errors.whatsappNumber}
              inputMode="tel"
              autoComplete="tel"
              placeholder="06 XX XX XX XX"
              onChange={(e) => onChange({ whatsappNumber: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("predefinedMessage")}
            label={f.predefinedMessage}
            hint={f.predefinedMessageHint}
            error={fieldMessage(dict, errors, "predefinedMessage")}
          >
            <Textarea
              id={fieldId("predefinedMessage")}
              value={str("predefinedMessage")}
              invalid={!!errors.predefinedMessage}
              onChange={(e) => onChange({ predefinedMessage: e.target.value })}
            />
          </Field>
        </>
      );
    case "INSTAGRAM_CARD":
      return (
        <Field
          id={fieldId("instagram")}
          label={f.instagram}
          hint={f.instagramHint}
          required
          error={fieldMessage(dict, errors, "instagram")}
        >
          <Input
            id={fieldId("instagram")}
            value={str("instagram")}
            invalid={!!errors.instagram}
            autoComplete="username"
            placeholder="@"
            onChange={(e) => onChange({ instagram: e.target.value })}
          />
        </Field>
      );
    case "CONTACT_CARD":
      return (
        <>
          <Field
            id={fieldId("fullName")}
            label={f.fullName}
            required
            error={fieldMessage(dict, errors, "fullName")}
          >
            <Input
              id={fieldId("fullName")}
              value={str("fullName")}
              invalid={!!errors.fullName}
              autoComplete="name"
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("professionalTitle")}
            label={f.professionalTitle}
            error={fieldMessage(dict, errors, "professionalTitle")}
          >
            <Input
              id={fieldId("professionalTitle")}
              value={str("professionalTitle")}
              invalid={!!errors.professionalTitle}
              onChange={(e) => onChange({ professionalTitle: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("company")}
            label={f.company}
            error={fieldMessage(dict, errors, "company")}
          >
            <Input
              id={fieldId("company")}
              value={str("company")}
              invalid={!!errors.company}
              autoComplete="organization"
              onChange={(e) => onChange({ company: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("phone")}
            label={f.phone}
            required
            error={fieldMessage(dict, errors, "phone")}
          >
            <Input
              id={fieldId("phone")}
              value={str("phone")}
              invalid={!!errors.phone}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </Field>
          <Field id={fieldId("email")} label={f.email} error={fieldMessage(dict, errors, "email")}>
            <Input
              id={fieldId("email")}
              value={str("email")}
              invalid={!!errors.email}
              inputMode="email"
              autoComplete="email"
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </Field>
        </>
      );
    case "CUSTOM_LINK_CARD":
      return (
        <>
          <Field
            id={fieldId("destinationUrl")}
            label={f.destinationUrl}
            required
            error={fieldMessage(dict, errors, "destinationUrl")}
          >
            <Input
              id={fieldId("destinationUrl")}
              value={str("destinationUrl")}
              invalid={!!errors.destinationUrl}
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              onChange={(e) => onChange({ destinationUrl: e.target.value })}
            />
          </Field>
          <Field
            id={fieldId("purpose")}
            label={f.purpose}
            error={fieldMessage(dict, errors, "purpose")}
          >
            <Input
              id={fieldId("purpose")}
              value={str("purpose")}
              invalid={!!errors.purpose}
              onChange={(e) => onChange({ purpose: e.target.value })}
            />
          </Field>
        </>
      );
  }
}
