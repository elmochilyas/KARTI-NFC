/**
 * Shared wizard submit contract (client state → server action).
 *
 * The browser validates for UX with the same Phase 1 schemas; the server
 * revalidates every field authoritatively and derives pricing/attribution
 * itself. Unknown fields are rejected by strict objects upstream.
 */

import { z } from "zod";
import { PRODUCT_TYPES } from "@/domain/orders/productTypes";
import { idempotencyKeySchema } from "@/domain/orders/idempotency";
import type { VitrineLocale } from "../i18n";

export const wizardLocaleSchema = z.enum(["fr", "ar", "en"]);

export const wizardQuantitySchema = z
  .number({ message: "quantityMin" })
  .int({ message: "quantityMin" })
  .min(1, { message: "quantityMin" });

export const wizardCustomerSchema = z.strictObject({
  fullName: z.string(),
  phone: z.string(),
  sameWhatsapp: z.boolean(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  preferredContact: z.enum(["WHATSAPP", "PHONE", "EMAIL"]),
});

export const wizardDeliverySchema = z.strictObject({
  city: z.string(),
  address: z.string(),
  instructions: z.string().optional(),
});

const touchSchema = z.strictObject({
  path: z.string().nullable(),
  referrerHost: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmContent: z.string().nullable(),
  utmTerm: z.string().nullable(),
});

/** Exact shape the wizard submits; server narrows/validates further. */
export const wizardSubmitSchema = z.strictObject({
  locale: wizardLocaleSchema,
  productType: z.enum(PRODUCT_TYPES),
  quantity: wizardQuantitySchema,
  configuration: z.record(z.string(), z.unknown()),
  customer: wizardCustomerSchema,
  delivery: wizardDeliverySchema,
  attribution: z.strictObject({
    first: touchSchema.nullable(),
    last: touchSchema.nullable(),
  }),
  idempotencyKey: idempotencyKeySchema,
  /** Honeypot: must stay empty; bots fill it. */
  website: z.string().max(0).optional(),
  /** Wizard mount timestamp (ms); rejects instant-bot submits. */
  startedAt: z.number(),
});

export type WizardSubmitInput = z.infer<typeof wizardSubmitSchema>;
export type WizardCustomerInput = z.infer<typeof wizardCustomerSchema>;
export type WizardDeliveryInput = z.infer<typeof wizardDeliverySchema>;

export const ORDER_WIZARD_MIN_FILL_MS = 3000;

export function assertLocale(value: string): VitrineLocale {
  if (value === "fr" || value === "ar" || value === "en") return value;
  return "fr";
}
