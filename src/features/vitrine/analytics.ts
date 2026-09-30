/**
 * Centralized privacy-safe marketing analytics (Phase 5). All event
 * names flow through here — never scattered vendor calls, never PII.
 *
 * No analytics vendor is approved yet, so the default transport is a
 * validated no-op: events are still type-checked and PII-scrubbed in
 * every environment, and a vendor can plug `setAnalyticsTransport`
 * without touching call sites.
 */

export const ANALYTICS_EVENTS = [
  "homepage_view",
  "page_view",
  "goal_selected",
  "tap_demo_changed",
  "product_page_view",
  "product_cta_click",
  "solution_page_view",
  "pricing_view",
  "faq_open",
  "order_started",
  "order_step_viewed",
  "order_step_completed",
  "order_product_selected",
  "order_quantity_changed",
  "order_submit_attempted",
  "order_submitted",
  "order_submit_failed",
  "whatsapp_clicked",
  "contact_inquiry_submitted",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

/** Payload keys that must never reach marketing analytics (PII). */
const FORBIDDEN_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "phone",
  "email",
  "whatsapp",
  "whatsapp_number",
  "address",
  "fullName",
  "full_name",
  "customer_name",
  "customerName",
  "name",
  "message",
  "inquiry_message",
  "city",
  "delivery_address",
  "delivery_instructions",
  "customer_note",
  "internal_note",
  "order_number",
  "receipt",
  "receipt_token",
  "receipt_hash",
  "token",
]);

/**
 * Dev-time PII guard: returns the payload unchanged in production, but
 * throws in development/test when a forbidden key is present so leaks
 * fail loudly before they ship.
 */
export function scrubAnalyticsPayload(payload: AnalyticsPayload): AnalyticsPayload {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) {
      throw new Error(`Analytics payload must not contain PII key: ${key}`);
    }
  }
  return payload;
}

type AnalyticsTransport = (event: AnalyticsEventName, payload: AnalyticsPayload) => void;

let transport: AnalyticsTransport = () => {};

export function setAnalyticsTransport(next: AnalyticsTransport | null): void {
  transport = next ?? (() => {});
}

export function trackEvent(event: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  transport(event, scrubAnalyticsPayload(payload));
}
