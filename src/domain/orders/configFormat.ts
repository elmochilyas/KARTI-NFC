/**
 * Human-readable order-item configuration for operators
 * (specs/specs-vitrin/04 §12). Never render raw JSON as the main UX.
 *
 * Defensive: stored configuration is validated at write time, but the
 * formatter tolerates missing/odd values and omits what is absent
 * (with explicit fallbacks where the spec requires them).
 */

import type { ProductType } from "./productTypes";

export type ConfigLine = {
  label: string;
  value: string;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function yesNo(value: unknown): string | null {
  if (typeof value !== "boolean") return null;
  return value ? "Yes" : "No";
}

function pushIf(lines: ConfigLine[], label: string, value: string | null): void {
  if (value !== null) lines.push({ label, value });
}

/**
 * Format one order item's stored configuration into operator lines.
 * Unknown product types yield an empty list (never raw JSON).
 */
export function formatOrderConfiguration(
  productType: ProductType,
  configuration: unknown,
): ConfigLine[] {
  if (typeof configuration !== "object" || configuration === null) return [];
  const config = configuration as Record<string, unknown>;
  const lines: ConfigLine[] = [];

  switch (productType) {
    case "PERSONAL_CARD":
      pushIf(lines, "Name", text(config.fullName));
      pushIf(lines, "Title", text(config.professionalTitle));
      break;
    case "CAREER_CARD":
      pushIf(lines, "Name", text(config.fullName));
      pushIf(lines, "Title", text(config.professionalTitle));
      pushIf(lines, "Field", text(config.fieldOfStudyOrWork));
      pushIf(lines, "Has CV", yesNo(config.hasCv));
      break;
    case "BUSINESS_CARD":
      pushIf(lines, "Business", text(config.businessName));
      pushIf(lines, "Category", text(config.businessCategory));
      pushIf(lines, "Has logo", yesNo(config.hasLogo));
      break;
    case "GOOGLE_REVIEW_CARD": {
      pushIf(lines, "Business", text(config.businessName));
      const url = text(config.reviewUrl);
      lines.push({
        label: "Review URL",
        value: url ?? "Missing — customer needs help",
      });
      break;
    }
    case "WHATSAPP_CARD":
      pushIf(lines, "Number", text(config.whatsappNumber));
      pushIf(lines, "Message", text(config.predefinedMessage));
      break;
    case "INSTAGRAM_CARD":
      pushIf(lines, "Instagram", text(config.instagram));
      break;
    case "CONTACT_CARD":
      pushIf(lines, "Name", text(config.fullName));
      pushIf(lines, "Title", text(config.professionalTitle));
      pushIf(lines, "Company", text(config.company));
      pushIf(lines, "Phone", text(config.phone));
      pushIf(lines, "Email", text(config.email));
      break;
    case "CUSTOM_LINK_CARD":
      pushIf(lines, "Destination URL", text(config.destinationUrl));
      pushIf(lines, "Purpose", text(config.purpose));
      break;
    default:
      return [];
  }

  return lines;
}
