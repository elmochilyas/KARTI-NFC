import { z } from "zod";
import { PRODUCT_TYPES } from "@/domain/orders/productTypes";

/**
 * Catalog CMS boundary validation (admin writes + public projection).
 *
 * - No raw HTML / scriptable content: angle brackets rejected in every
 *   free-text field; `javascript:` URLs rejected.
 * - Bounded lengths mirror the DB CHECKs; array sizes capped so the CMS
 *   cannot become an unbounded page builder.
 * - Price input is a decimal MAD *string* parsed by the existing
 *   `parseMadDecimalToMinor` (integer math only, never float).
 */

const NO_HTML = /[<>]/;

function optionalTextField(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((value) => value === null || !NO_HTML.test(value), {
      message: "Must not contain HTML.",
    })
    .refine((value) => value === null || value.length <= max, {
      message: `Must be at most ${max} characters.`,
    });
}

export const productTypeField = z.enum(PRODUCT_TYPES);

export const availabilityField = z
  .union([z.enum(["IN_STOCK", "OUT_OF_STOCK", "PREORDER"]), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined || value === null || value === "") return null;
    return value;
  });

const stringListField = (maxItems: number, maxItemLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxItemLength))
    .max(maxItems)
    .refine((items) => items.every((item) => !NO_HTML.test(item)), {
      message: "Must not contain HTML.",
    });

const faqListField = z
  .array(
    z.strictObject({
      q: z.string().trim().min(1).max(160),
      a: z.string().trim().min(1).max(1000),
    }),
  )
  .max(20)
  .refine((items) => items.every((item) => !NO_HTML.test(item.q) && !NO_HTML.test(item.a)), {
    message: "Must not contain HTML.",
  });

export const catalogProductUpdateSchema = z.strictObject({
  published: z.boolean(),
  /**
   * Decimal MAD string ("199", "249.50") or empty while "Price not
   * configured". Empty is an admin readiness state, not a pricing mode:
   * the product cannot be ordered and emits no Offer until priced.
   */
  priceMad: z.string().trim().max(20).nullish(),
  availability: availabilityField,
});

export const catalogLocalizationSchema = z.strictObject({
  productType: productTypeField,
  locale: z.enum(["fr", "en", "ar"]),
  displayName: optionalTextField(120),
  shortName: optionalTextField(40),
  heroTitle: optionalTextField(160),
  heroDescription: optionalTextField(500),
  shortDescription: optionalTextField(300),
  outcomeText: optionalTextField(500),
  pricingNote: optionalTextField(300),
  seoTitle: optionalTextField(160),
  seoDescription: optionalTextField(300),
  audiences: stringListField(12, 120),
  benefits: stringListField(12, 200),
  useCases: stringListField(12, 200),
  included: stringListField(20, 200),
  faqs: faqListField,
});

export const catalogMediaRoleField = z.enum(["PRIMARY", "GALLERY", "CARD_PREVIEW", "OG"]);

export const catalogMediaAltSchema = z.strictObject({
  altFr: optionalTextField(160),
  altEn: optionalTextField(160),
  altAr: optionalTextField(160),
});

export const catalogMediaReorderSchema = z.strictObject({
  productType: productTypeField,
  /** Exact ordered id list (must equal the product's current media set). */
  orderedIds: z.array(z.string().uuid()).max(30),
});

export type CatalogProductUpdateInput = z.infer<typeof catalogProductUpdateSchema>;
export type CatalogLocalizationInput = z.infer<typeof catalogLocalizationSchema>;
