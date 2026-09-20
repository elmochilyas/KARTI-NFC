import { z } from "zod";

const MAX_NAME = 120;
const MAX_COMPANY = 120;
const MAX_NOTES = 2000;

/** Empty optional text normalizes to null (never store ""). */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const nameField = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(MAX_NAME, `Name must be ${MAX_NAME} characters or fewer.`);

export const companyField = z
  .string()
  .max(MAX_COMPANY + 20, `Company must be ${MAX_COMPANY} characters or fewer.`)
  .transform(emptyToNull)
  .refine((v) => v === null || v.length <= MAX_COMPANY, {
    message: `Company must be ${MAX_COMPANY} characters or fewer.`,
  });

const PHONE_PATTERN = /^[+()\-.\s\d]+$/;

export const phoneField = z
  .string()
  .transform((v) => v.trim().replace(/\s{2,}/g, " "))
  .refine((v) => v === "" || (v.length >= 4 && v.length <= 32), {
    message: "Enter a valid phone number.",
  })
  .refine((v) => v === "" || PHONE_PATTERN.test(v), {
    message: "Phone may only contain digits, spaces, and + - ( ) .",
  })
  .transform((v) => (v === "" ? null : v));

export const emailField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address.",
  });

export const notesField = z
  .string()
  .transform(emptyToNull)
  .refine((v) => v === null || v.length <= MAX_NOTES, {
    message: `Notes must be ${MAX_NOTES} characters or fewer.`,
  });

/** Full client form (dashboard). Notes are admin-only — never public. */
export const clientSchema = z.object({
  name: nameField,
  company: companyField,
  phone: phoneField,
  email: emailField,
  notes: notesField,
});

export type ClientInput = z.infer<typeof clientSchema>;

/** Quick Add: name + phone (+ company); same field rules, same table. */
export const quickAddSchema = z.object({
  name: nameField,
  company: companyField,
  phone: phoneField,
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
