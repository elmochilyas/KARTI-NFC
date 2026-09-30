/**
 * Public order/inquiry server actions (Phase 2.3).
 *
 * Controlled server-side write path for anonymous visitors. Anonymous
 * callers hold zero table grants; atomicity comes from the
 * `create_public_*` RPCs executed through the narrow order-writer
 * client (ADR-071). Server validation is authoritative — every field is
 * revalidated/derived here regardless of browser input.
 */
"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { classifyAcquisitionSource } from "@/domain/orders/attribution";
import { getProductDefinition } from "@/domain/orders/catalog";
import { idempotencyKeySchema } from "@/domain/orders/idempotency";
import {
  isValidEmailShape,
  normalizeEmail,
  normalizePhone,
  normalizeWhatsApp,
} from "@/domain/orders/normalize";
import { priceOrder } from "@/domain/orders/pricing";
import { PRODUCT_TYPES, isProductType } from "@/domain/orders/productTypes";
import { orderProductConfigurationSchema } from "@/domain/orders/schemas";
import { createOrderWriterClient } from "@/lib/supabase/orderWriter";
import { getClientIp, isHoneypotFilled, isTooFast } from "../antispam";
import { checkPublicRateLimit } from "../rateLimitServer";
import { ATTRIBUTION_COOKIE, parseAttributionCookie, type TouchContext } from "../attribution";
import { deriveReceiptToken, hashReceiptToken } from "./receipt";

export type PublicMutationErrorCode = "VALIDATION" | "SPAM" | "RATE_LIMITED" | "UNAVAILABLE";

export type CreatePublicOrderResult =
  | { ok: true; data: { orderNumber: string; receiptToken: string } }
  | { ok: false; error: { code: PublicMutationErrorCode } };

export type CreatePublicInquiryResult =
  | { ok: true; data: { inquiryId: string } }
  | { ok: false; error: { code: PublicMutationErrorCode } };

const MAX_NAME = 120;
const MAX_CITY = 120;
const MAX_ADDRESS = 500;
const MAX_NOTES = 1000;
const MAX_MESSAGE = 5000;

const orderInputSchema = z.strictObject({
  locale: z.enum(["fr", "ar", "en"]),
  productType: z.enum(PRODUCT_TYPES),
  quantity: z.number().int().min(1),
  configuration: z.record(z.string(), z.unknown()),
  customer: z.strictObject({
    fullName: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    preferredContact: z.enum(["WHATSAPP", "PHONE", "EMAIL"]),
  }),
  delivery: z.strictObject({
    city: z.string(),
    address: z.string(),
    instructions: z.string(),
  }),
  idempotencyKey: idempotencyKeySchema,
  website: z.string().optional(),
  startedAt: z.number(),
});

const INQUIRY_TYPES = [
  "GENERAL",
  "BULK_ORDER",
  "CORPORATE",
  "PARTNERSHIP",
  "CUSTOM_REQUEST",
  "OTHER",
] as const;

const inquiryInputSchema = z.strictObject({
  locale: z.enum(["fr", "ar", "en"]),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  inquiryType: z.enum(INQUIRY_TYPES),
  message: z.string(),
  website: z.string().optional(),
  startedAt: z.number(),
});

function invalid(): CreatePublicOrderResult {
  return { ok: false, error: { code: "VALIDATION" } };
}

function spam(): CreatePublicOrderResult {
  return { ok: false, error: { code: "SPAM" } };
}

function limited(): CreatePublicOrderResult {
  return { ok: false, error: { code: "RATE_LIMITED" } };
}

function unavailable(): CreatePublicOrderResult {
  return { ok: false, error: { code: "UNAVAILABLE" } };
}

type AttributionColumns = {
  firstTouchSource: string | null;
  firstLandingPath: string | null;
  firstReferrer: string | null;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  firstUtmContent: string | null;
  firstUtmTerm: string | null;
  lastTouchSource: string | null;
  conversionPath: string | null;
  lastReferrer: string | null;
  lastUtmSource: string | null;
  lastUtmMedium: string | null;
  lastUtmCampaign: string | null;
  lastUtmContent: string | null;
  lastUtmTerm: string | null;
};

function touchToSignals(touch: TouchContext | null): {
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  if (!touch) {
    return { referrer: null, utm_source: null, utm_medium: null, utm_campaign: null };
  }
  return {
    referrer: touch.referrerHost ? `https://${touch.referrerHost}/` : null,
    utm_source: touch.utmSource,
    utm_medium: touch.utmMedium,
    utm_campaign: touch.utmCampaign,
  };
}

function deriveAttribution(
  rawCookie: string | null,
  fallbackPath: string | null,
): AttributionColumns {
  const snapshot = parseAttributionCookie(rawCookie);
  const firstSignals = touchToSignals(snapshot.first);
  const lastSignals = touchToSignals(snapshot.last ?? snapshot.first);
  const firstSource = classifyAcquisitionSource({
    referrer: firstSignals.referrer,
    utmSource: firstSignals.utm_source,
    utmMedium: firstSignals.utm_medium,
    utmCampaign: snapshot.first?.utmCampaign ?? null,
  });
  const lastSource = classifyAcquisitionSource({
    referrer: lastSignals.referrer,
    utmSource: lastSignals.utm_source,
    utmMedium: lastSignals.utm_medium,
    utmCampaign: snapshot.last?.utmCampaign ?? snapshot.first?.utmCampaign ?? null,
  });
  const first = snapshot.first;
  const last = snapshot.last ?? snapshot.first;
  return {
    firstTouchSource: firstSource,
    firstLandingPath: first?.path ?? null,
    firstReferrer: firstSignals.referrer,
    firstUtmSource: first?.utmSource ?? null,
    firstUtmMedium: first?.utmMedium ?? null,
    firstUtmCampaign: first?.utmCampaign ?? null,
    firstUtmContent: first?.utmContent ?? null,
    firstUtmTerm: first?.utmTerm ?? null,
    lastTouchSource: lastSource,
    conversionPath: last?.path ?? fallbackPath,
    lastReferrer: lastSignals.referrer,
    lastUtmSource: last?.utmSource ?? null,
    lastUtmMedium: last?.utmMedium ?? null,
    lastUtmCampaign: last?.utmCampaign ?? null,
    lastUtmContent: last?.utmContent ?? null,
    lastUtmTerm: last?.utmTerm ?? null,
  };
}

/**
 * Server-authoritative public order creation.
 *
 * Validates → normalizes → server-prices → server-attributes → single
 * atomic RPC. Returns the minimal public receipt (order number +
 * one-time receipt token).
 */
export async function createPublicOrderAction(rawInput: unknown): Promise<CreatePublicOrderResult> {
  const nowMs = Date.now();
  try {
    // Durable rate limit first (Postgres fixed-window bucket keyed by an
    // HMAC of the IP; the raw IP is transient only, never stored).
    const headerStore = await headers();
    const ip = getClientIp(headerStore.get("x-forwarded-for"));
    if (!(await checkPublicRateLimit("order", ip)).allowed) return limited();

    const parsed = orderInputSchema.safeParse(rawInput);
    if (!parsed.success) return invalid();
    const input = parsed.data;

    // Anti-spam: honeypot + fill-time sanity.
    if (isHoneypotFilled(input.website)) return spam();
    if (isTooFast(input.startedAt, nowMs)) return spam();

    if (!isProductType(input.productType)) return invalid();
    const definition = getProductDefinition(input.productType);
    if (!Number.isInteger(input.quantity) || input.quantity < definition.minQuantity) {
      return invalid();
    }

    // Exact discriminated product configuration (rejects mismatches).
    const configResult = orderProductConfigurationSchema.safeParse({
      productType: input.productType,
      configuration: input.configuration,
    });
    if (!configResult.success) return invalid();
    const configuration = configResult.data.configuration as Record<string, unknown>;

    // Customer fields: trim, bound, normalize; never trust raw input.
    const fullName = input.customer.fullName.trim();
    if (fullName === "" || fullName.length > MAX_NAME) return invalid();
    const phoneNormalized = normalizePhone(input.customer.phone);
    if (phoneNormalized === null) return invalid();
    const whatsappNormalized = normalizeWhatsApp(input.customer.whatsapp);
    if (whatsappNormalized === null) return invalid();
    const emailRaw = input.customer.email.trim();
    if (input.customer.preferredContact === "EMAIL") {
      if (emailRaw === "") return invalid();
    }
    let emailNormalized: string | null = null;
    if (emailRaw !== "") {
      const normalized = normalizeEmail(emailRaw);
      if (!isValidEmailShape(normalized)) return invalid();
      emailNormalized = normalized;
    } else if (input.customer.preferredContact === "EMAIL") {
      return invalid();
    }

    // Delivery fields: trim + bound.
    const city = input.delivery.city.trim();
    const address = input.delivery.address.trim();
    const instructions = input.delivery.instructions.trim();
    if (city === "" || city.length > MAX_CITY) return invalid();
    if (address === "" || address.length > MAX_ADDRESS) return invalid();
    if (instructions.length > MAX_NOTES) return invalid();

    // Server-authoritative pricing from the catalog (browser amounts
    // cannot reach this function — no price input exists).
    const pricing = priceOrder({ productType: input.productType, quantity: input.quantity });

    // Server-derived attribution from the first-party cookie.
    const cookieStore = await cookies();
    const attribution = deriveAttribution(
      cookieStore.get(ATTRIBUTION_COOKIE)?.value ?? null,
      `/${input.locale}/order`,
    );

    // Deterministic per idempotency key: a lost-response retry re-derives
    // the SAME token, so the returned receipt always resolves.
    const receiptToken = deriveReceiptToken(input.idempotencyKey);
    const receiptTokenHash = hashReceiptToken(receiptToken);

    const writer = createOrderWriterClient();
    const { data, error } = await writer.rpc("create_public_order", {
      p_customer_name: fullName,
      p_phone: input.customer.phone.trim(),
      p_phone_normalized: phoneNormalized,
      p_whatsapp: input.customer.whatsapp.trim(),
      p_whatsapp_normalized: whatsappNormalized,
      p_email: emailRaw === "" ? null : emailRaw,
      p_email_normalized: emailNormalized,
      p_preferred_contact: input.customer.preferredContact,
      p_city: city,
      p_delivery_address: address,
      p_delivery_notes: instructions === "" ? null : instructions,
      p_product_type: input.productType,
      p_quantity: input.quantity,
      p_configuration: configuration,
      p_unit_price_minor: pricing.unitPriceMinor ?? null,
      p_line_total_minor: pricing.subtotalMinor ?? null,
      p_subtotal_minor: pricing.subtotalMinor ?? null,
      p_delivery_fee_minor: pricing.deliveryFeeMinor,
      p_discount_minor: pricing.discountMinor,
      p_total_minor: pricing.totalMinor ?? null,
      p_pricing_status: pricing.pricingStatus,
      p_locale: input.locale,
      p_customer_notes: null,
      p_first_touch_source: attribution.firstTouchSource,
      p_first_landing_path: attribution.firstLandingPath,
      p_first_referrer: attribution.firstReferrer,
      p_first_utm_source: attribution.firstUtmSource,
      p_first_utm_medium: attribution.firstUtmMedium,
      p_first_utm_campaign: attribution.firstUtmCampaign,
      p_first_utm_content: attribution.firstUtmContent,
      p_first_utm_term: attribution.firstUtmTerm,
      p_last_touch_source: attribution.lastTouchSource,
      p_conversion_path: attribution.conversionPath,
      p_last_referrer: attribution.lastReferrer,
      p_last_utm_source: attribution.lastUtmSource,
      p_last_utm_medium: attribution.lastUtmMedium,
      p_last_utm_campaign: attribution.lastUtmCampaign,
      p_last_utm_content: attribution.lastUtmContent,
      p_last_utm_term: attribution.lastUtmTerm,
      p_idempotency_key: input.idempotencyKey,
      p_receipt_token_hash: receiptTokenHash,
    } as never);

    if (error || !data || data.length === 0 || !data[0].order_number) return unavailable();
    return {
      ok: true,
      data: { orderNumber: data[0].order_number, receiptToken },
    };
  } catch {
    return unavailable();
  }
}

/** Server-authoritative public inquiry creation (inquiries only, never orders). */
export async function createPublicInquiryAction(
  rawInput: unknown,
): Promise<CreatePublicInquiryResult> {
  const nowMs = Date.now();
  const fail = (code: PublicMutationErrorCode): CreatePublicInquiryResult => ({
    ok: false,
    error: { code },
  });
  try {
    const headerStore = await headers();
    const ip = getClientIp(headerStore.get("x-forwarded-for"));
    if (!(await checkPublicRateLimit("inquiry", ip)).allowed) return fail("RATE_LIMITED");

    const parsed = inquiryInputSchema.safeParse(rawInput);
    if (!parsed.success) return fail("VALIDATION");
    const input = parsed.data;

    if (isHoneypotFilled(input.website)) return fail("SPAM");
    if (isTooFast(input.startedAt, nowMs)) return fail("SPAM");

    const name = input.name.trim();
    const message = input.message.trim();
    if (name === "" || name.length > MAX_NAME) return fail("VALIDATION");
    if (message === "" || message.length > MAX_MESSAGE) return fail("VALIDATION");

    let phoneNormalized: string | null = null;
    const phoneRaw = (input.phone ?? "").trim();
    if (phoneRaw !== "") {
      phoneNormalized = normalizePhone(phoneRaw);
      if (phoneNormalized === null) return fail("VALIDATION");
    }
    let emailNormalized: string | null = null;
    const emailRaw = (input.email ?? "").trim();
    if (emailRaw !== "") {
      const normalized = normalizeEmail(emailRaw);
      if (!isValidEmailShape(normalized)) return fail("VALIDATION");
      emailNormalized = normalized;
    }
    const company = (input.company ?? "").trim();
    if (company.length > MAX_NAME) return fail("VALIDATION");

    const cookieStore = await cookies();
    const attribution = deriveAttribution(
      cookieStore.get(ATTRIBUTION_COOKIE)?.value ?? null,
      `/${input.locale}/contact`,
    );

    const writer = createOrderWriterClient();
    const { data, error } = await writer.rpc("create_public_inquiry", {
      p_name: name,
      p_phone: phoneRaw === "" ? null : phoneRaw,
      p_phone_normalized: phoneNormalized,
      p_email: emailRaw === "" ? null : emailRaw,
      p_email_normalized: emailNormalized,
      p_company: company === "" ? null : company,
      p_inquiry_type: input.inquiryType,
      p_message: message,
      p_locale: input.locale,
      p_source: attribution.lastTouchSource,
      p_landing_path: attribution.conversionPath,
      p_referrer: attribution.lastReferrer,
      p_utm_source: attribution.lastUtmSource,
      p_utm_medium: attribution.lastUtmMedium,
      p_utm_campaign: attribution.lastUtmCampaign,
      p_utm_content: attribution.lastUtmContent,
      p_utm_term: attribution.lastUtmTerm,
    } as never);

    if (error || !data) return fail("UNAVAILABLE");
    return { ok: true, data: { inquiryId: String(data) } };
  } catch {
    return fail("UNAVAILABLE");
  }
}
