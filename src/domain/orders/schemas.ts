/**
 * Product-specific configuration schemas (specs/specs-vitrin/07 §6).
 *
 * Strict objects: unknown fields are rejected (never silently persisted).
 * Discriminated union on productType rejects mismatched configs
 * (e.g. WHATSAPP_CARD + reviewUrl).
 */

import { z } from "zod";
import { validateSafeExternalUrl } from "@/domain/urls";
import {
  isValidEmailShape,
  normalizeEmail,
  normalizeHttpsUrl,
  normalizeInstagram,
  normalizePhone,
} from "./normalize";

export const MAX_NAME_LENGTH = 120;
export const MAX_SHORT_TEXT = 120;
export const MAX_PURPOSE_LENGTH = 1000;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_URL_LENGTH = 2048;

const nonEmptyText = (max: number) => z.string().trim().min(1, "This field is required.").max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

function validPhoneNumber(message = "Enter a valid phone number.") {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((v) => normalizePhone(v) !== null, { message });
}

function optionalValidEmail() {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : normalizeEmail(v)))
    .refine((v) => v === undefined || isValidEmailShape(v), {
      message: "Enter a valid email address.",
    })
    .optional();
}

export const personalCardConfigSchema = z.strictObject({
  fullName: nonEmptyText(MAX_NAME_LENGTH),
  professionalTitle: optionalText(MAX_SHORT_TEXT),
});

export const careerCardConfigSchema = z.strictObject({
  fullName: nonEmptyText(MAX_NAME_LENGTH),
  professionalTitle: optionalText(MAX_SHORT_TEXT),
  fieldOfStudyOrWork: optionalText(MAX_SHORT_TEXT),
  hasCv: z.boolean(),
});

export const businessCardConfigSchema = z.strictObject({
  businessName: nonEmptyText(MAX_NAME_LENGTH),
  businessCategory: optionalText(MAX_SHORT_TEXT),
  hasLogo: z.boolean().optional(),
});

const httpsUrlField = (message = "Enter a valid https URL.") =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(MAX_URL_LENGTH)
    .refine((v) => normalizeHttpsUrl(v) !== null, { message });

export const googleReviewCardConfigSchema = z
  .strictObject({
    businessName: nonEmptyText(MAX_NAME_LENGTH),
    reviewUrl: z.string().trim().max(MAX_URL_LENGTH).optional(),
    needsUrlHelp: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const raw = (value.reviewUrl ?? "").trim();
    // needsUrlHelp=false → valid HTTPS reviewUrl required (any host, not a
    // single hard-coded Google hostname).
    if (!value.needsUrlHelp) {
      if (!raw) {
        ctx.addIssue({
          code: "custom",
          path: ["reviewUrl"],
          message: "Review URL is required unless you ask for help.",
        });
        return;
      }
      if (normalizeHttpsUrl(raw) === null) {
        ctx.addIssue({
          code: "custom",
          path: ["reviewUrl"],
          message: "Enter a valid https URL.",
        });
      }
      return;
    }
    // needsUrlHelp=true → reviewUrl may be missing, but when provided it
    // must still be a safe https URL.
    if (raw && normalizeHttpsUrl(raw) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewUrl"],
        message: "Enter a valid https URL.",
      });
    }
  });

export const whatsappCardConfigSchema = z.strictObject({
  // Canonical destination is generated server-side from this number;
  // an arbitrary WhatsApp URL is never the source of truth.
  whatsappNumber: validPhoneNumber("Enter a valid WhatsApp number."),
  predefinedMessage: optionalText(MAX_MESSAGE_LENGTH),
});

export const instagramCardConfigSchema = z.strictObject({
  instagram: z
    .string()
    .trim()
    .min(1, "Instagram is required.")
    .max(MAX_URL_LENGTH)
    .refine((v) => normalizeInstagram(v) !== null, {
      message: "Enter an Instagram username or instagram.com profile URL.",
    }),
});

export const contactCardConfigSchema = z.strictObject({
  fullName: nonEmptyText(MAX_NAME_LENGTH),
  professionalTitle: optionalText(MAX_SHORT_TEXT),
  company: optionalText(MAX_SHORT_TEXT),
  phone: validPhoneNumber(),
  email: optionalValidEmail(),
});

export const customLinkCardConfigSchema = z.strictObject({
  destinationUrl: httpsUrlField(),
  purpose: optionalText(MAX_PURPOSE_LENGTH),
});

export const orderProductConfigurationSchema = z.discriminatedUnion("productType", [
  z.object({
    productType: z.literal("PERSONAL_CARD"),
    configuration: personalCardConfigSchema,
  }),
  z.object({
    productType: z.literal("CAREER_CARD"),
    configuration: careerCardConfigSchema,
  }),
  z.object({
    productType: z.literal("BUSINESS_CARD"),
    configuration: businessCardConfigSchema,
  }),
  z.object({
    productType: z.literal("GOOGLE_REVIEW_CARD"),
    configuration: googleReviewCardConfigSchema,
  }),
  z.object({
    productType: z.literal("WHATSAPP_CARD"),
    configuration: whatsappCardConfigSchema,
  }),
  z.object({
    productType: z.literal("INSTAGRAM_CARD"),
    configuration: instagramCardConfigSchema,
  }),
  z.object({
    productType: z.literal("CONTACT_CARD"),
    configuration: contactCardConfigSchema,
  }),
  z.object({
    productType: z.literal("CUSTOM_LINK_CARD"),
    configuration: customLinkCardConfigSchema,
  }),
]);

export type OrderProductConfiguration = z.infer<typeof orderProductConfigurationSchema>;

/** Re-export for callers that validate a single product config directly. */
export const productConfigSchemas = {
  PERSONAL_CARD: personalCardConfigSchema,
  CAREER_CARD: careerCardConfigSchema,
  BUSINESS_CARD: businessCardConfigSchema,
  GOOGLE_REVIEW_CARD: googleReviewCardConfigSchema,
  WHATSAPP_CARD: whatsappCardConfigSchema,
  INSTAGRAM_CARD: instagramCardConfigSchema,
  CONTACT_CARD: contactCardConfigSchema,
  CUSTOM_LINK_CARD: customLinkCardConfigSchema,
} as const;

/** Guard for stored external destinations (shares the card-domain rule). */
export function isSafeExternalDestination(value: unknown): boolean {
  return validateSafeExternalUrl(value) !== null;
}
