/**
 * Delivery-Sheet dashboard server actions (admin session required).
 *
 * Operational only: test, setup, resync. Configuration comes exclusively
 * from server environment variables — the dashboard never reads, writes,
 * generates, or returns integration credentials. Separate boundary from
 * the CRON_SECRET retry endpoint, which uses machine authentication.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDeliverySyncClient } from "@/lib/supabase/deliverySync";
import { getDeliverySheetsConfig } from "@/lib/env-server";
import { sendOrderToDeliveryScript } from "./appsScript";
import { retryDueDeliverySyncs, syncOrderToDeliverySheet } from "./sync";

export type DeliverySheetActionState = {
  ok: boolean;
  message: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdminSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED: DeliverySheetActionState = {
  ok: false,
  message: "Sign in to manage the delivery Sheet.",
};

/** Manual recovery for one order: same central sync, never duplicates. */
export async function resyncOrderToSheetAction(orderId: string): Promise<DeliverySheetActionState> {
  if (!UUID_PATTERN.test(orderId)) {
    return { ok: false, message: "Order not found." };
  }
  if (!(await requireAdminSession())) return UNAUTHORIZED;
  // Manual Resync forces transmission even when the payload hash matches.
  const outcome = await syncOrderToDeliverySheet(orderId, { force: true });
  if (outcome.ok) {
    revalidatePath(`/dashboard/orders/${orderId}`);
    return {
      ok: true,
      message:
        outcome.mode === "unchanged"
          ? "Delivery Sheet is already up to date."
          : outcome.mode === "created"
            ? "Order added to the delivery Sheet."
            : "Delivery Sheet row updated.",
    };
  }
  if (outcome.mode === "skipped-disabled") {
    return { ok: false, message: "Delivery Sheet is not configured yet." };
  }
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {
    ok: false,
    message: "Sync failed and was queued for retry. Check Settings for details.",
  };
}

/** Bulk recovery: sync due PENDING (+ retryable FAILED) rows, upsert-only. */
export async function bulkSyncUnsentOrdersAction(): Promise<DeliverySheetActionState> {
  if (!(await requireAdminSession())) return UNAUTHORIZED;
  const counts = await retryDueDeliverySyncs(50);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/settings");
  if (counts.synced === 0 && counts.failed === 0) {
    return { ok: true, message: "Nothing to sync — all delivery rows are current." };
  }
  return {
    ok: counts.failed === 0,
    message: `Delivery sync: ${counts.synced} synced, ${counts.unchanged} unchanged, ${counts.failed} failed.`,
  };
}

/**
 * Sheet setup via the Apps Script Web App (idempotent server-side
 * `setupDeliverySheet()`): headers, freeze/filter, formats, dropdowns,
 * protections. Karti never touches the Sheet directly.
 */
export async function runDeliverySheetSetupAction(): Promise<DeliverySheetActionState> {
  if (!(await requireAdminSession())) return UNAUTHORIZED;
  if (!getDeliverySheetsConfig().enabled) {
    return { ok: false, message: "Delivery Sheet is not configured yet." };
  }
  const outcome = await sendOrderToDeliveryScript({ type: "SETUP_SHEET" });
  revalidatePath("/dashboard/settings");
  if (outcome.ok) {
    return { ok: true, message: "Sheet setup complete." };
  }
  return {
    ok: false,
    message: outcome.retryable
      ? "Setup request failed and can be retried."
      : "Setup request was rejected. Check the Apps Script deployment.",
  };
}

export type DeliverySyncBadgeState = {
  status: "SYNCED" | "PENDING" | "FAILED" | "NOT_TRACKED";
  lastSyncedAt: string | null;
  lastError: string | null;
};

/** Non-secret sync status for the order detail badge (admin RLS read). */
export async function getOrderDeliverySyncState(
  orderId: string,
): Promise<DeliverySyncBadgeState | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("order_delivery_sheet_sync")
      .select("sync_status, last_synced_at, last_error")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!data) return { status: "NOT_TRACKED", lastSyncedAt: null, lastError: null };
    const status =
      data.sync_status === "SYNCED" ||
      data.sync_status === "PENDING" ||
      data.sync_status === "FAILED"
        ? data.sync_status
        : "NOT_TRACKED";
    // Strip the terminal marker; never surface raw internals beyond a hint.
    const lastError =
      typeof data.last_error === "string"
        ? data.last_error.replace(/^terminal:\s*/, "").slice(0, 160)
        : null;
    return { status, lastSyncedAt: data.last_synced_at, lastError };
  } catch {
    return null;
  }
}

export type ConnectionStatus = "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" | "ERROR";

export type DeliverySettingsSummary = {
  /**
   * Operational status. CONFIGURED means env validation passed but no live
   * PING has succeeded in this session; the Test connection button reports
   * Connected ✓ live when requested.
   */
  status: ConnectionStatus;
  lastSuccessfulSyncAt: string | null;
  failedCount: number | null;
};

/**
 * Non-secret integration summary for Settings. Secrets and full URLs are
 * never included — status + operational counts only.
 */
export async function getDeliverySettingsSummary(): Promise<DeliverySettingsSummary> {
  const config = getDeliverySheetsConfig();
  const summary: DeliverySettingsSummary = {
    status: config.enabled ? "CONFIGURED" : "NOT_CONFIGURED",
    lastSuccessfulSyncAt: null,
    failedCount: null,
  };
  try {
    const db = createDeliverySyncClient();
    const [{ data: last }, { count }] = await Promise.all([
      db
        .from("order_delivery_sheet_sync")
        .select("last_synced_at")
        .eq("sync_status", "SYNCED")
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("order_delivery_sheet_sync")
        .select("order_id", { count: "exact", head: true })
        .eq("sync_status", "FAILED"),
    ]);
    summary.lastSuccessfulSyncAt = last?.last_synced_at ?? null;
    summary.failedCount = count ?? 0;
    if ((summary.failedCount ?? 0) > 0) summary.status = "ERROR";
  } catch {
    // Summary degrades to status-only; never blocks Settings.
  }
  return summary;
}

/** Harmless signed PING against the Web App — no fake orders created. */
export async function testDeliveryConnectionAction(): Promise<DeliverySheetActionState> {
  if (!(await requireAdminSession())) return UNAUTHORIZED;
  if (!getDeliverySheetsConfig().enabled) {
    return { ok: false, message: "Configure the delivery integration in the server environment." };
  }
  const outcome = await sendOrderToDeliveryScript({ type: "PING" });
  if (outcome.ok) {
    revalidatePath("/dashboard/settings");
    return { ok: true, message: "Connected ✓ — the delivery Sheet answered." };
  }
  return {
    ok: false,
    message: outcome.retryable
      ? "No answer yet — the script may be waking up. Try again in a minute."
      : "The Web App rejected the request. Check the deployment and secrets.",
  };
}
