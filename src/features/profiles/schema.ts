import { z } from "zod";
import { isReservedSlug, normalizeSlug } from "@/domain/slugs";
import { validateSafeExternalUrl } from "@/domain/urls";

export const PROFILE_TYPES = ["PERSON", "BUSINESS"] as const;
export const PROFILE_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export const PROFILE_THEMES = ["light", "dark"] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type ProfileTheme = (typeof PROFILE_THEMES)[number];

const MAX_DISPLAY_NAME = 120;
const MAX_SHORT = 120;
const MAX_BIO = 500;

/** Empty optional text normalizes to null (never store ""). */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const optionalText = (max: number) =>
  z
    .string()
    .max(max + 20, `Must be ${max} characters or fewer.`)
    .transform(emptyToNull)
    .refine((v) => v === null || v.length <= max, {
      message: `Must be ${max} characters or fewer.`,
    });

const optionalPhone = z
  .string()
  .transform((v) => v.trim().replace(/\s{2,}/g, " "))
  .refine((v) => v === "" || (v.length >= 4 && v.length <= 32), {
    message: "Enter a valid phone number.",
  })
  .refine((v) => v === "" || /^[+()\-.\s\d]+$/.test(v), {
    message: "Phone may only contain digits, spaces, and + - ( ) .",
  })
  .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address.",
  });

const optionalSafeUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : (validateSafeExternalUrl(v) ?? "")))
  .refine((v) => v !== "", { message: "Enter a valid http(s) URL." })
  .transform((v) => (v === "" ? null : v));

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Stored-asset reference: "" (none) or a server-generated storage path.
 * Strict shape match (mirrors `assetPath` in storage.ts) so a crafted form
 * value cannot point the public profile at an arbitrary path/URL.
 */
const STORAGE_PATH_PATTERN =
  /^profiles\/([0-9a-f-]{1,64}|pending)\/(avatar|cover)\/[0-9a-f]{16}\.(jpg|png|webp)$/;

export const assetPathField = z
  .string()
  .trim()
  .refine((v) => v === "" || STORAGE_PATH_PATTERN.test(v), {
    message: "Invalid image reference.",
  })
  .transform((v) => (v === "" ? null : v));

export const accentColorField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .refine((v) => v === null || HEX_COLOR_PATTERN.test(v), {
    message: "Accent must be a hex color like #0e7c5b.",
  });

/** Slug input: normalized via shared domain rules; reserved rejected here. */
export const slugField = z
  .string()
  .transform((v) => normalizeSlug(v))
  .refine((v) => v !== "", { message: "Slug is required." })
  .refine((v) => v.length <= MAX_SHORT, {
    message: `Slug must be ${MAX_SHORT} characters or fewer.`,
  })
  .refine((v) => !isReservedSlug(v), { message: "This slug is reserved." });

/** Full profile form (dashboard editor). */
export const profileSchema = z.object({
  profile_type: z.enum(PROFILE_TYPES, { message: "Choose PERSON or BUSINESS." }),
  slug: slugField,
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(MAX_DISPLAY_NAME, `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`),
  job_title: optionalText(MAX_SHORT),
  company_name: optionalText(MAX_SHORT),
  bio: optionalText(MAX_BIO),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  email: optionalEmail,
  website: optionalSafeUrl,
  address: optionalText(240),
  maps_url: optionalSafeUrl,
  accent_color: accentColorField,
  theme: z.enum(PROFILE_THEMES, { message: "Choose light or dark." }),
  avatar_path: assetPathField,
  cover_path: assetPathField,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const profileStatusSchema = z.enum(PROFILE_STATUSES);

export type ProfileStatusInput = z.infer<typeof profileStatusSchema>;
