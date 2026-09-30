/**
 * Centralized direct-action destination resolution
 * (specs/specs-vitrin/05 §§9, 17-18). Reuses the Phase 1
 * normalize/build helpers; stored configuration is re-validated
 * field-by-field (never trusted raw).
 *
 * Profile products never resolve here — their cards point at the linked
 * Profile via order_items.profile_id.
 */

import type { ProductType } from "./productTypes";
import { requiresProfileForProduct } from "./catalog";
import {
  buildWhatsAppDestination,
  normalizeHttpsUrl,
  normalizeInstagram,
  normalizePhone,
} from "./normalize";

export type DestinationResolution =
  { ok: true; url: string } | { ok: false; code: "DESTINATION_REQUIRED" | "INVALID_DESTINATION" };

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function configObject(configuration: unknown): Record<string, unknown> | null {
  if (typeof configuration !== "object" || configuration === null) return null;
  return configuration as Record<string, unknown>;
}

function resolveGoogleReview(configuration: unknown): DestinationResolution {
  const config = configObject(configuration);
  if (!config) return { ok: false, code: "INVALID_DESTINATION" };
  const rawUrl = text(config.reviewUrl);
  if (rawUrl) {
    const url = normalizeHttpsUrl(rawUrl);
    return url ? { ok: true, url } : { ok: false, code: "INVALID_DESTINATION" };
  }
  // Missing URL: the customer asked for help (or data predates the URL).
  // Conversion may proceed, but card provisioning stays blocked.
  return { ok: false, code: "DESTINATION_REQUIRED" };
}

function resolveWhatsapp(configuration: unknown): DestinationResolution {
  const config = configObject(configuration);
  if (!config) return { ok: false, code: "INVALID_DESTINATION" };
  const rawNumber = text(config.whatsappNumber);
  if (!rawNumber) return { ok: false, code: "INVALID_DESTINATION" };
  const normalized = normalizePhone(rawNumber);
  if (!normalized) return { ok: false, code: "INVALID_DESTINATION" };
  const url = buildWhatsAppDestination(normalized, text(config.predefinedMessage) ?? undefined);
  return url ? { ok: true, url } : { ok: false, code: "INVALID_DESTINATION" };
}

function resolveInstagram(configuration: unknown): DestinationResolution {
  const config = configObject(configuration);
  if (!config) return { ok: false, code: "INVALID_DESTINATION" };
  const raw = text(config.instagram);
  if (!raw) return { ok: false, code: "INVALID_DESTINATION" };
  const url = normalizeInstagram(raw);
  return url ? { ok: true, url } : { ok: false, code: "INVALID_DESTINATION" };
}

function resolveCustomLink(configuration: unknown): DestinationResolution {
  const config = configObject(configuration);
  if (!config) return { ok: false, code: "INVALID_DESTINATION" };
  const raw = text(config.destinationUrl);
  if (!raw) return { ok: false, code: "INVALID_DESTINATION" };
  const url = normalizeHttpsUrl(raw);
  return url ? { ok: true, url } : { ok: false, code: "INVALID_DESTINATION" };
}

export function resolveOrderItemDestination(
  productType: ProductType,
  configuration: unknown,
): DestinationResolution {
  if (requiresProfileForProduct(productType)) {
    return { ok: false, code: "INVALID_DESTINATION" };
  }
  switch (productType) {
    case "GOOGLE_REVIEW_CARD":
      return resolveGoogleReview(configuration);
    case "WHATSAPP_CARD":
      return resolveWhatsapp(configuration);
    case "INSTAGRAM_CARD":
      return resolveInstagram(configuration);
    case "CUSTOM_LINK_CARD":
      return resolveCustomLink(configuration);
    default:
      return { ok: false, code: "INVALID_DESTINATION" };
  }
}
