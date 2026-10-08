import "server-only";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";
import { getServiceRoleKey } from "@/lib/env-server";
import type { Database } from "@/types/database";

if (typeof window !== "undefined") {
  throw new Error("src/lib/supabase/deliverySync.ts must never be imported in the browser.");
}

/**
 * Narrow privileged client for the Google Sheets delivery integration.
 *
 * Justification (same pattern as ADR-071's order-writer client): the Sheet
 * sync path runs outside any admin browser session (public order creation
 * `after()`, HMAC webhook, CRON_SECRET retry), so it cannot use the
 * user-scoped client. This client exists SOLELY for:
 *   - `order_delivery_sheet_sync` mapping rows (read/write);
 *   - `delivery_sheet_webhook_nonces` replay-protection rows (read/write);
 *   - executing the `sheets_apply_*` RPCs (granted to service_role only);
 *   - projected order/order-item reads for Sheet row building
 *     (explicit column lists — never receipt_token_hash or secrets).
 *
 * Raw writes to orders/order_items/order_events through this client are
 * forbidden — all order mutations go through the `sheets_apply_*` or
 * `admin_*` RPCs. Never import from Client Components.
 */
export function createDeliverySyncClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = getServiceRoleKey();
  return createJsClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
