import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AppsScriptTransport } from "./appsScript";
import {
  isTerminalSyncError,
  nextRetryAtMs,
  retryDueDeliverySyncs,
  syncOrderToDeliverySheet,
  type OrderSnapshot,
  type SyncStore,
} from "./sync";
import type { SyncStoreMapping } from "./types";

const ORDER_ID = "123e4567-e89b-12d3-a456-426614174000";

function snapshot(status = "NEW"): OrderSnapshot {
  return {
    order: {
      id: ORDER_ID,
      orderNumber: "KARTI-000123",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T11:00:00.000Z",
      customerName: "Yasmine El Fassi",
      phone: "+212612345678",
      city: "Casablanca",
      deliveryAddress: "12 Rue Anfa",
      deliveryNotes: null,
      subtotalMinor: 19900,
      deliveryFeeMinor: 3000,
      discountMinor: 0,
      totalMinor: 22900,
      currency: "MAD",
      orderStatus: status,
      fulfillmentStatus: "NOT_STARTED",
      paymentStatus: "PENDING",
    },
    items: [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
  };
}

function createFakeStore(initialSnap: OrderSnapshot | null = snapshot()): SyncStore & {
  mappings: Map<string, SyncStoreMapping>;
  snap: OrderSnapshot | null;
} {
  const mappings = new Map<string, SyncStoreMapping>();
  const store: SyncStore & { mappings: Map<string, SyncStoreMapping>; snap: OrderSnapshot | null } =
    {
      mappings,
      snap: initialSnap,
      async getMapping(orderId) {
        return mappings.get(orderId) ?? null;
      },
      async ensurePending(orderId) {
        if (!mappings.has(orderId)) {
          mappings.set(orderId, {
            orderId,
            lastPayloadHash: null,
            syncStatus: "PENDING",
            retryCount: 0,
            nextRetryAt: null,
            lastError: null,
            lastSyncedAt: null,
          });
        }
      },
      async markSynced(orderId, hash, syncedAtIso) {
        mappings.set(orderId, {
          orderId,
          lastPayloadHash: hash,
          syncStatus: "SYNCED",
          retryCount: 0,
          nextRetryAt: null,
          lastError: null,
          lastSyncedAt: syncedAtIso,
        });
      },
      async markFailed(orderId, terminal, error, nextRetryAtIso) {
        const prev = mappings.get(orderId);
        const retryCount = (prev?.retryCount ?? 0) + 1;
        mappings.set(orderId, {
          orderId,
          lastPayloadHash: prev?.lastPayloadHash ?? null,
          syncStatus: terminal || retryCount >= 8 ? "FAILED" : "PENDING",
          retryCount,
          nextRetryAt: terminal ? null : nextRetryAtIso,
          lastError: terminal ? `terminal: ${error}` : error,
          lastSyncedAt: prev?.lastSyncedAt ?? null,
        });
        return retryCount;
      },
      async getOrderSnapshot() {
        return store.snap;
      },
      async listDue() {
        return [...mappings.values()];
      },
    };
  return store;
}

function okTransport(result = "CREATED"): AppsScriptTransport & { calls: number } {
  const t = {
    calls: 0,
    async post() {
      t.calls += 1;
      return { status: 200, text: JSON.stringify({ ok: true, operation: "UPSERT_ORDER", result }) };
    },
  };
  return t;
}

function failingTransport(status: number, text: string): AppsScriptTransport {
  return { post: async () => ({ status, text }) };
}

beforeEach(() => {
  process.env.DELIVERY_SHEETS_ENABLED = "true";
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = "test-apps-script-secret-32-chars-min!!";
  process.env.DELIVERY_SHEETS_WEBHOOK_SECRET = "test-webhook-secret-32-chars-minimum!!";
  process.env.CRON_SECRET = "test-cron-secret-16";
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T00:00:00.000Z"));
});

afterEach(() => {
  delete process.env.DELIVERY_SHEETS_ENABLED;
  delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL;
  delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET;
  delete process.env.DELIVERY_SHEETS_WEBHOOK_SECRET;
  delete process.env.CRON_SECRET;
  vi.useRealTimers();
});

describe("syncOrderToDeliverySheet idempotency", () => {
  it("delivers once on first sync, no-ops on second (hash skip, no HTTP)", async () => {
    const store = createFakeStore();
    const transport = okTransport();
    const first = await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    expect(first).toEqual({ ok: true, mode: "created" });
    expect(transport.calls).toBe(1);

    const second = await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    expect(second).toEqual({ ok: true, mode: "unchanged" });
    expect(transport.calls).toBe(1);
  });

  it("retransmits when the order changes", async () => {
    const store = createFakeStore();
    const transport = okTransport("UPDATED");
    await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    store.snap = snapshot("CONFIRMED");
    const second = await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    expect(second).toEqual({ ok: true, mode: "updated" });
    expect(transport.calls).toBe(2);
  });

  it("manual resync forces transmission even when unchanged", async () => {
    const store = createFakeStore();
    const transport = okTransport();
    await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    const forced = await syncOrderToDeliverySheet(ORDER_ID, { transport, store, force: true });
    expect(forced).toEqual({ ok: true, mode: "created" });
    expect(transport.calls).toBe(2);
  });
});

describe("sync failure behavior", () => {
  it.each([
    ["429", 429, "rate limited"],
    ["500", 500, "backend error"],
  ])("marks PENDING retryable on Apps Script %s without throwing", async (_label, status, text) => {
    const store = createFakeStore();
    const outcome = await syncOrderToDeliverySheet(ORDER_ID, {
      transport: failingTransport(status, text),
      store,
    });
    expect(outcome.ok).toBe(false);
    const mapping = await store.getMapping(ORDER_ID);
    expect(mapping?.syncStatus).toBe("PENDING");
    expect(mapping?.retryCount).toBe(1);
    expect(mapping?.nextRetryAt).not.toBeNull();
    expect(isTerminalSyncError(mapping?.lastError ?? null)).toBe(false);
    expect(store.snap?.order.orderNumber).toBe("KARTI-000123");
  });

  it("marks FAILED terminal on malformed responses and auth rejections", async () => {
    const store = createFakeStore();
    const malformed = await syncOrderToDeliverySheet(ORDER_ID, {
      transport: failingTransport(200, "not json{{{"),
      store,
    });
    expect(malformed.ok).toBe(false);
    expect((await store.getMapping(ORDER_ID))?.syncStatus).toBe("FAILED");
    expect(isTerminalSyncError((await store.getMapping(ORDER_ID))?.lastError ?? null)).toBe(true);

    const store2 = createFakeStore();
    await syncOrderToDeliverySheet(ORDER_ID, {
      transport: failingTransport(401, JSON.stringify({ ok: false, code: "INVALID_SIGNATURE" })),
      store: store2,
    });
    expect((await store2.getMapping(ORDER_ID))?.syncStatus).toBe("FAILED");
  });

  it("treats timeouts as retryable", async () => {
    const store = createFakeStore();
    const outcome = await syncOrderToDeliverySheet(ORDER_ID, {
      transport: {
        post: async () => {
          throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
        },
      },
      store,
    });
    expect(outcome.ok).toBe(false);
    expect((await store.getMapping(ORDER_ID))?.syncStatus).toBe("PENDING");
  });

  it("returns not-found for missing orders and skips when disabled", async () => {
    const store = createFakeStore(null);
    const missing = await syncOrderToDeliverySheet(ORDER_ID, { transport: okTransport(), store });
    expect(missing).toMatchObject({ ok: false, mode: "not-found" });

    delete process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL;
    const disabled = await syncOrderToDeliverySheet(ORDER_ID, { transport: okTransport(), store });
    expect(disabled).toMatchObject({ ok: false, mode: "skipped-disabled" });
  });

  it("respects the explicit kill switch", async () => {
    process.env.DELIVERY_SHEETS_ENABLED = "false";
    const store = createFakeStore();
    const outcome = await syncOrderToDeliverySheet(ORDER_ID, { transport: okTransport(), store });
    expect(outcome).toMatchObject({ ok: false, mode: "skipped-disabled" });
  });
});

describe("retry sweep + backoff", () => {
  it("computes exponential backoff capped at 30 minutes", () => {
    expect(nextRetryAtMs(0, 0)).toBe(60_000);
    expect(nextRetryAtMs(1, 0)).toBe(120_000);
    expect(nextRetryAtMs(5, 0)).toBe(1_800_000);
    expect(nextRetryAtMs(9, 0)).toBe(1_800_000);
    expect(isTerminalSyncError("terminal: boom")).toBe(true);
    expect(isTerminalSyncError("boom")).toBe(false);
    expect(isTerminalSyncError(null)).toBe(false);
  });

  it("recovers end-to-end: PENDING → SYNCED via retry", async () => {
    const store = createFakeStore();
    await syncOrderToDeliverySheet(ORDER_ID, {
      transport: failingTransport(500, "boom"),
      store,
    });
    expect((await store.getMapping(ORDER_ID))?.syncStatus).toBe("PENDING");
    const transport = okTransport();
    const counts = await retryDueDeliverySyncs(25, { transport, store });
    expect(counts).toEqual({ synced: 1, unchanged: 0, failed: 0 });
    expect((await store.getMapping(ORDER_ID))?.syncStatus).toBe("SYNCED");
  });

  it("returns bounded counts without redelivering unchanged rows", async () => {
    const store = createFakeStore();
    const transport = okTransport();
    await syncOrderToDeliverySheet(ORDER_ID, { transport, store });
    const counts = await retryDueDeliverySyncs(25, { transport, store });
    expect(counts).toEqual({ synced: 0, unchanged: 1, failed: 0 });
    expect(transport.calls).toBe(1);
  });
});
