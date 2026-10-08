/**
 * Central delivery-Sheet synchronization (server-only).
 *
 * ONE funnel for every Order → Sheet write: public creation, dashboard
 * mutations, webhook sync-back, manual resync, bulk retry. Components never
 * touch the delivery transport directly.
 *
 * Transport is the bound Apps Script Web App (signed envelopes): Karti
 * never talks to the Sheets API, stores no spreadsheet coordinates, and
 * resolves nothing by row number — Order ID (Sheet column B) is the remote
 * identity and Apps Script upserts by it under LockService.
 *
 * Idempotent on both sides: equal payload hash + SYNCED ⇒ no outbound
 * request; Apps Script independently upserts by Order ID. Failures never
 * throw to order flows — they are recorded (PENDING retryable / FAILED
 * terminal-or-exhausted) for the CRON_SECRET cron + admin resync.
 */
import "server-only";

import { getDeliverySheetsConfig } from "@/lib/env-server";
import { createDeliverySyncClient } from "@/lib/supabase/deliverySync";
import {
  sendOrderToDeliveryScript,
  truncateDeliveryError,
  type AppsScriptTransport,
} from "./appsScript";
import { buildDeliverySheetRow } from "./mapping";
import type {
  DeliveryOrderItemSnapshot,
  DeliveryOrderSnapshot,
  SyncOutcome,
  SyncStatus,
  SyncStoreMapping,
} from "./types";

export const MAX_SYNC_ATTEMPTS = 8;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_CAP_MS = 30 * 60 * 1000;
const TERMINAL_PREFIX = "terminal: ";

/** Exponential backoff: 1m, 2m, 4m … capped at 30m. Pure (tested). */
export function nextRetryAtMs(retryCount: number, nowMs: number): number {
  const shift = Math.min(Math.max(retryCount, 0), 5);
  return nowMs + Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** shift);
}

export function isTerminalSyncError(storedError: string | null): boolean {
  return storedError !== null && storedError.startsWith(TERMINAL_PREFIX);
}

export type OrderSnapshot = {
  order: DeliveryOrderSnapshot;
  items: DeliveryOrderItemSnapshot[];
};

export type SyncStore = {
  getMapping(orderId: string): Promise<SyncStoreMapping | null>;
  ensurePending(orderId: string): Promise<void>;
  markSynced(orderId: string, hash: string, syncedAtIso: string): Promise<void>;
  /** Records failure; returns the new retry count. */
  markFailed(
    orderId: string,
    terminal: boolean,
    error: string,
    nextRetryAtIso: string | null,
  ): Promise<number>;
  getOrderSnapshot(orderId: string): Promise<OrderSnapshot | null>;
  listDue(limit: number, nowIso: string): Promise<SyncStoreMapping[]>;
};

const ORDER_SNAPSHOT_COLUMNS =
  "id, order_number, created_at, updated_at, customer_name, phone, city, delivery_address, delivery_notes, subtotal_minor, delivery_fee_minor, discount_minor, total_minor, currency, status, payment_status, fulfillment_status" as const;

const ITEM_SNAPSHOT_COLUMNS = "product_type, quantity, unit_price_minor" as const;

function toSnapshot(
  orderRow: Record<string, unknown>,
  itemRows: Record<string, unknown>[],
): OrderSnapshot {
  return {
    order: {
      id: String(orderRow.id),
      orderNumber: String(orderRow.order_number),
      createdAt: String(orderRow.created_at),
      updatedAt: String(orderRow.updated_at),
      customerName: String(orderRow.customer_name),
      phone: String(orderRow.phone),
      city: String(orderRow.city),
      deliveryAddress: String(orderRow.delivery_address),
      deliveryNotes:
        orderRow.delivery_notes === null || orderRow.delivery_notes === undefined
          ? null
          : String(orderRow.delivery_notes),
      subtotalMinor: Number(orderRow.subtotal_minor),
      deliveryFeeMinor: Number(orderRow.delivery_fee_minor),
      discountMinor: Number(orderRow.discount_minor),
      totalMinor: Number(orderRow.total_minor),
      currency: String(orderRow.currency ?? "MAD"),
      orderStatus: String(orderRow.status),
      fulfillmentStatus: String(orderRow.fulfillment_status),
      paymentStatus: String(orderRow.payment_status),
    },
    items: itemRows.map((item) => ({
      productType: String(item.product_type),
      quantity: Number(item.quantity),
      unitPriceMinor: Number(item.unit_price_minor),
    })),
  };
}

export function createSupabaseSyncStore(): SyncStore {
  return {
    async getMapping(orderId) {
      const db = createDeliverySyncClient();
      const { data } = await db
        .from("order_delivery_sheet_sync")
        .select(
          "order_id, last_payload_hash, sync_status, retry_count, next_retry_at, last_error, last_synced_at",
        )
        .eq("order_id", orderId)
        .maybeSingle();
      if (!data) return null;
      return {
        orderId: data.order_id,
        lastPayloadHash: data.last_payload_hash,
        syncStatus: data.sync_status as SyncStatus,
        retryCount: data.retry_count,
        nextRetryAt: data.next_retry_at,
        lastError: data.last_error,
        lastSyncedAt: data.last_synced_at,
      };
    },

    async ensurePending(orderId) {
      const db = createDeliverySyncClient();
      const { data: existing } = await db
        .from("order_delivery_sheet_sync")
        .select("order_id, sync_status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (!existing) {
        await db.from("order_delivery_sheet_sync").insert({
          order_id: orderId,
          sync_status: "PENDING",
          retry_count: 0,
          next_retry_at: new Date().toISOString(),
        });
        return;
      }
      // A previous terminal failure becomes retryable work again (fresh
      // order attempt / operator re-submission path); SYNCED/PENDING stay.
      if (existing.sync_status === "FAILED") {
        await db
          .from("order_delivery_sheet_sync")
          .update({
            sync_status: "PENDING",
            retry_count: 0,
            next_retry_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("order_id", orderId);
      }
    },

    async markSynced(orderId, hash, syncedAtIso) {
      const db = createDeliverySyncClient();
      await db.from("order_delivery_sheet_sync").upsert(
        {
          order_id: orderId,
          last_payload_hash: hash,
          sync_status: "SYNCED",
          retry_count: 0,
          next_retry_at: null,
          last_error: null,
          last_synced_at: syncedAtIso,
        },
        { onConflict: "order_id" },
      );
    },

    async markFailed(orderId, terminal, error, nextRetryAtIso) {
      const db = createDeliverySyncClient();
      const { data: existing } = await db
        .from("order_delivery_sheet_sync")
        .select("order_id, retry_count")
        .eq("order_id", orderId)
        .maybeSingle();
      const retryCount = (existing?.retry_count ?? 0) + 1;
      const stored = terminal ? `${TERMINAL_PREFIX}${error}` : error;
      await db.from("order_delivery_sheet_sync").upsert(
        {
          order_id: orderId,
          sync_status: terminal || retryCount >= MAX_SYNC_ATTEMPTS ? "FAILED" : "PENDING",
          retry_count: retryCount,
          next_retry_at: terminal ? null : nextRetryAtIso,
          last_error: stored,
        },
        { onConflict: "order_id" },
      );
      return retryCount;
    },

    async getOrderSnapshot(orderId) {
      const db = createDeliverySyncClient();
      const { data: orderRow } = await db
        .from("orders")
        .select(ORDER_SNAPSHOT_COLUMNS)
        .eq("id", orderId)
        .maybeSingle();
      if (!orderRow) return null;
      const { data: itemRows } = await db
        .from("order_items")
        .select(ITEM_SNAPSHOT_COLUMNS)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      return toSnapshot(
        orderRow as unknown as Record<string, unknown>,
        ((itemRows ?? []) as unknown as Record<string, unknown>[]).map((r) => ({ ...r })),
      );
    },

    async listDue(limit, nowIso) {
      const db = createDeliverySyncClient();
      const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 25;
      const { data } = await db
        .from("order_delivery_sheet_sync")
        .select(
          "order_id, last_payload_hash, sync_status, retry_count, next_retry_at, last_error, last_synced_at",
        )
        .or(`sync_status.eq.PENDING,sync_status.eq.FAILED`)
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
        .order("next_retry_at", { ascending: true, nullsFirst: true })
        .limit(safeLimit);
      const rows = (data ?? []).map((row) => ({
        orderId: row.order_id,
        lastPayloadHash: row.last_payload_hash,
        syncStatus: row.sync_status as SyncStatus,
        retryCount: row.retry_count,
        nextRetryAt: row.next_retry_at,
        lastError: row.last_error,
        lastSyncedAt: row.last_synced_at,
      }));
      // Cron retries PENDING work and FAILED rows that are still retryable
      // (under the attempt cap, no terminal marker). Terminal auth/config
      // failures wait for an operator Resync instead of burning quota.
      return rows.filter(
        (row) =>
          row.syncStatus === "PENDING" ||
          (row.retryCount < MAX_SYNC_ATTEMPTS && !isTerminalSyncError(row.lastError)),
      );
    },
  };
}

export type SyncDeps = {
  transport?: AppsScriptTransport;
  store?: SyncStore;
  nowMs?: number;
  /** Manual Resync forces transmission even when the hash is unchanged. */
  force?: boolean;
};

/**
 * Durable initial-sync marker. Called synchronously right after the
 * authoritative order RPC succeeds (BEFORE returning to the customer), so
 * the work item survives even if the runtime ends before the delivery
 * attempt runs. Never throws.
 */
export async function ensurePendingSyncRow(
  orderId: string,
  deps?: Pick<SyncDeps, "store">,
): Promise<void> {
  try {
    const store = deps?.store ?? createSupabaseSyncStore();
    await store.ensurePending(orderId);
  } catch {
    // Authoritative order already exists — sync bookkeeping must never
    // break the customer response.
  }
}

/**
 * The central sync operation. Loads the authoritative snapshot, builds the
 * normalized row, and delivers it to the Apps Script Web App (which
 * upserts by Order ID). Records the mapping. Never throws — failures are
 * returned AND recorded for retry.
 */
export async function syncOrderToDeliverySheet(
  orderId: string,
  deps?: SyncDeps,
): Promise<SyncOutcome> {
  const nowMs = deps?.nowMs ?? Date.now();
  const syncedAtIso = new Date(nowMs).toISOString();
  const fail = async (message: string, terminal: boolean): Promise<SyncOutcome> => {
    try {
      const store = deps?.store ?? createSupabaseSyncStore();
      const current = await store.getMapping(orderId).catch(() => null);
      const attempts = current?.retryCount ?? 0;
      await store.markFailed(
        orderId,
        terminal,
        truncateDeliveryError(message),
        terminal ? null : new Date(nextRetryAtMs(attempts, nowMs)).toISOString(),
      );
    } catch {
      // Mapping write itself failed — still report, never throw.
    }
    return { ok: false, mode: "failed", error: message };
  };

  try {
    const config = getDeliverySheetsConfig();
    if (!config.enabled) {
      return { ok: false, mode: "skipped-disabled", error: "Delivery Sheet is not configured." };
    }
    const store = deps?.store ?? createSupabaseSyncStore();

    const [mapping, snapshot] = await Promise.all([
      store.getMapping(orderId),
      store.getOrderSnapshot(orderId),
    ]);
    if (!snapshot) {
      await fail("order-not-found", true);
      return { ok: false, mode: "not-found", error: "Order not found." };
    }

    const row = buildDeliverySheetRow(snapshot.order, snapshot.items, syncedAtIso);
    if (!deps?.force && mapping?.syncStatus === "SYNCED" && mapping.lastPayloadHash === row.hash) {
      return { ok: true, mode: "unchanged" };
    }

    const outcome = await sendOrderToDeliveryScript(
      { type: "UPSERT_ORDER", orderId, values: row.values },
      { transport: deps?.transport, nowMs },
    );
    if (!outcome.ok) {
      return fail(`${outcome.code}: ${outcome.message}`, !outcome.retryable);
    }
    await store.markSynced(orderId, row.hash, syncedAtIso);
    const mode = outcome.result === "CREATED" ? "created" : "updated";
    return { ok: true, mode };
  } catch (error) {
    const message =
      error instanceof Error ? `${error.name}: ${error.message}` : "Delivery sync error";
    return fail(message, false);
  }
}

export type BulkSyncCounts = { synced: number; unchanged: number; failed: number };

/** Cron/admin sweep over due PENDING (+ retryable FAILED) rows. */
export async function retryDueDeliverySyncs(
  limit: number,
  deps?: SyncDeps,
): Promise<BulkSyncCounts> {
  const counts: BulkSyncCounts = { synced: 0, unchanged: 0, failed: 0 };
  try {
    const store = deps?.store ?? createSupabaseSyncStore();
    const due = await store.listDue(limit, new Date(deps?.nowMs ?? Date.now()).toISOString());
    for (const mapping of due) {
      const outcome = await syncOrderToDeliverySheet(mapping.orderId, deps);
      if (outcome.ok) {
        if (outcome.mode === "unchanged") counts.unchanged += 1;
        else counts.synced += 1;
      } else {
        counts.failed += 1;
      }
    }
  } catch {
    // Sweep-level failure: counts stay as accumulated; never throws.
  }
  return counts;
}
