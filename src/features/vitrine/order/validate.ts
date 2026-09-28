/**
 * Pure wizard step validation (framework-independent, unit-tested).
 *
 * Returns per-field error KEYS (not localized text); components map keys
 * to `dict.order.validation.*`. Mirrors server rules so UX matches, but
 * the server always revalidates authoritatively.
 */

import { isValidEmailShape, normalizePhone } from "@/domain/orders/normalize";
import { productConfigSchemas } from "@/domain/orders/schemas";
import type { ProductType } from "@/domain/orders/productTypes";

export type ValidationKey =
  | "required"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidUrl"
  | "invalidInstagram"
  | "reviewUrlRequired"
  | "quantityMin";

export type FieldErrors = Record<string, ValidationKey>;

/** Validate a raw product configuration; returns parsed data on success. */
export function validateConfig(
  product: ProductType,
  raw: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: FieldErrors } {
  const result = productConfigSchemas[product].safeParse(raw);
  if (result.success) return { ok: true, data: result.data as Record<string, unknown> };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "_");
    if (errors[field]) continue;
    errors[field] = mapIssueToKey(product, field);
  }
  return { ok: false, errors };
}

function mapIssueToKey(product: ProductType, field: string): ValidationKey {
  if (field === "email") return "invalidEmail";
  if (field === "phone" || field === "whatsappNumber") return "invalidPhone";
  if (field === "instagram") return "invalidInstagram";
  if (field === "destinationUrl" || field === "reviewUrl") {
    if (product === "GOOGLE_REVIEW_CARD" && field === "reviewUrl") return "reviewUrlRequired";
    return "invalidUrl";
  }
  return "required";
}

export type CustomerForm = {
  fullName: string;
  phone: string;
  sameWhatsapp: boolean;
  whatsapp: string;
  email: string;
  preferredContact: "WHATSAPP" | "PHONE" | "EMAIL";
};

export function validateCustomer(form: CustomerForm): FieldErrors {
  const errors: FieldErrors = {};
  if (form.fullName.trim() === "") errors.fullName = "required";
  if (normalizePhone(form.phone) === null) errors.phone = "invalidPhone";
  if (!form.sameWhatsapp && form.whatsapp.trim() !== "") {
    if (normalizePhone(form.whatsapp) === null) errors.whatsapp = "invalidPhone";
  }
  const email = form.email.trim().toLowerCase();
  if (form.preferredContact === "EMAIL") {
    if (email === "") errors.email = "required";
    else if (!isValidEmailShape(email)) errors.email = "invalidEmail";
  } else if (email !== "" && !isValidEmailShape(email)) {
    errors.email = "invalidEmail";
  }
  return errors;
}

export type DeliveryForm = {
  city: string;
  address: string;
  instructions: string;
};

export function validateDelivery(form: DeliveryForm): FieldErrors {
  const errors: FieldErrors = {};
  if (form.city.trim() === "") errors.city = "required";
  if (form.address.trim() === "") errors.address = "required";
  return errors;
}

export function validateQuantity(quantity: unknown): boolean {
  return typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1;
}

/** Resolve the effective WhatsApp value (derived or explicit). */
export function resolveWhatsapp(form: CustomerForm): string {
  if (form.sameWhatsapp) return form.phone.trim();
  if (form.whatsapp.trim() !== "") return form.whatsapp.trim();
  return form.phone.trim();
}
