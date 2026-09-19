import { z } from "zod";
import { validateSafeExternalUrl } from "@/domain/urls";

export const CARD_STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "ACTIVE",
  "DISABLED",
  "LOST",
  "REPLACED",
] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const CARD_DESTINATIONS = ["PROFILE", "EXTERNAL_URL"] as const;

export type CardDestination = (typeof CARD_DESTINATIONS)[number];

export const cardStatusSchema = z.enum(CARD_STATUSES, { message: "Choose a valid status." });

export const clientIdSchema = z.string().uuid("Choose a valid client.");

/** External destination URL: validated + normalized, unsafe schemes rejected. */
export const externalUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required.")
  .refine((v) => validateSafeExternalUrl(v) !== null, {
    message: "Enter a valid http(s) URL.",
  })
  .transform((v) => validateSafeExternalUrl(v) as string);

export const profileIdSchema = z.string().uuid("Choose a valid profile.");
