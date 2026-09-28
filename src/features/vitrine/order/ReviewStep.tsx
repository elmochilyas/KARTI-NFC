/**
 * Wizard Step 4 — Review.
 *
 * Readable summary only: never raw JSON. Edit buttons return to prior
 * steps without losing state. CTA reads "Send request" (QUOTE wording).
 */

import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict } from "../i18n";
import type { CustomerForm, DeliveryForm } from "./validate";

function configSummary(
  dict: VitrineDict,
  product: ProductType,
  config: Record<string, unknown>,
): { label: string; value: string }[] {
  const f = dict.order.fields;
  const rows: { label: string; value: string }[] = [];
  const text = (key: string, label: string) => {
    const raw = config[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      rows.push({ label, value: raw.trim() });
    }
  };
  const flag = (key: string, label: string) => {
    if (typeof config[key] === "boolean") {
      rows.push({ label, value: config[key] ? f.yes : f.no });
    }
  };
  switch (product) {
    case "PERSONAL_CARD":
      text("fullName", f.fullName);
      text("professionalTitle", f.professionalTitle);
      break;
    case "CAREER_CARD":
      text("fullName", f.fullName);
      text("professionalTitle", f.professionalTitle);
      text("fieldOfStudyOrWork", f.fieldOfStudyOrWork);
      flag("hasCv", f.hasCv);
      break;
    case "BUSINESS_CARD":
      text("businessName", f.businessName);
      text("businessCategory", f.businessCategory);
      flag("hasLogo", f.hasLogo);
      break;
    case "GOOGLE_REVIEW_CARD":
      text("businessName", f.businessName);
      text("reviewUrl", f.reviewUrl);
      if (config.needsUrlHelp === true)
        rows.push({ label: f.needsUrlHelp, value: f.needsUrlHelpOption });
      break;
    case "WHATSAPP_CARD":
      text("whatsappNumber", f.whatsappNumber);
      text("predefinedMessage", f.predefinedMessage);
      break;
    case "INSTAGRAM_CARD":
      text("instagram", f.instagram);
      break;
    case "CONTACT_CARD":
      text("fullName", f.fullName);
      text("professionalTitle", f.professionalTitle);
      text("company", f.company);
      text("phone", f.phone);
      text("email", f.email);
      break;
    case "CUSTOM_LINK_CARD":
      text("destinationUrl", f.destinationUrl);
      text("purpose", f.purpose);
      break;
  }
  return rows;
}

export function ReviewStep({
  dict,
  product,
  productName,
  quantity,
  config,
  customer,
  customerWhatsapp,
  delivery,
  onEdit,
}: {
  dict: VitrineDict;
  product: ProductType;
  productName: string;
  quantity: number;
  config: Record<string, unknown>;
  customer: CustomerForm;
  customerWhatsapp: string;
  delivery: DeliveryForm;
  onEdit: (step: number) => void;
}) {
  const r = dict.order.review;
  const contactLabel =
    customer.preferredContact === "WHATSAPP"
      ? dict.order.fields.contactWhatsapp
      : customer.preferredContact === "EMAIL"
        ? dict.order.fields.contactEmail
        : dict.order.fields.contactPhone;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold">{r.title}</h3>

      <section aria-label={r.product} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{r.product}</p>
            <p className="font-bold">{productName}</p>
            <p className="mt-1 text-sm">
              {r.quantity}: {quantity}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-medium text-accent"
            onClick={() => onEdit(0)}
          >
            {r.edit}
          </button>
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          <dt className="text-muted">{r.configuration}</dt>
          {configSummary(dict, product, config).map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="shrink-0 text-muted">{row.label}:</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={r.customer} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{r.customer}</p>
            <p className="font-bold">{customer.fullName}</p>
            <p className="mt-1 text-sm">{customer.phone}</p>
            <p className="text-sm">{customerWhatsapp}</p>
            {customer.email.trim() !== "" ? (
              <p className="text-sm">{customer.email.trim()}</p>
            ) : null}
            <p className="mt-1 text-sm">
              {r.preferredContact}: {contactLabel}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-medium text-accent"
            onClick={() => onEdit(1)}
          >
            {r.edit}
          </button>
        </div>
      </section>

      <section aria-label={r.delivery} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{r.delivery}</p>
            <p className="font-bold">{delivery.city}</p>
            <p className="mt-1 whitespace-pre-line text-sm">{delivery.address}</p>
            {delivery.instructions.trim() !== "" ? (
              <p className="mt-1 text-sm text-muted">{delivery.instructions}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-medium text-accent"
            onClick={() => onEdit(2)}
          >
            {r.edit}
          </button>
        </div>
      </section>

      <section aria-label={r.pricing} className="rounded-xl bg-neutral-muted p-4">
        <p className="text-sm text-muted">{r.pricing}</p>
        <p className="font-bold">{r.quotePending}</p>
        <p className="mt-1 text-sm text-muted">{dict.order.quoteNote}</p>
      </section>
    </div>
  );
}
