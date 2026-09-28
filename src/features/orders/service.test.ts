import { describe, expect, it, vi } from "vitest";
import { needsActionOrFilter } from "@/domain/orders";
import {
  cancelOrder,
  completeOrder,
  confirmOrder,
  escapeOrderSearch,
  getOrderDetail,
  getOrdersSummary,
  listInquiries,
  listOrders,
  markOrderContacted,
  setOrderPrice,
  updateCustomerNote,
  updateFulfillmentStatus,
  updateInquiryStatus,
  updateInternalNote,
  updatePaymentStatus,
  type OrdersDb,
} from "./service";
import { DEFAULT_ORDERS_QUERY } from "./params";

type TableResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

const CHAIN_METHODS = [
  "select",
  "eq",
  "or",
  "not",
  "in",
  "is",
  "order",
  "range",
  "limit",
  "single",
  "maybeSingle",
  "update",
  "insert",
] as const;

type Chain = Record<(typeof CHAIN_METHODS)[number], ReturnType<typeof vi.fn>> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then: any;
};

function makeChain(result: TableResult): Chain {
  const chain = {} as Chain;
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: TableResult) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

type FakeDb = {
  db: OrdersDb;
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  chains: Array<{ table: string; chain: Chain }>;
};

function fakeDb(opts: {
  claims?: unknown;
  tables?: Record<string, TableResult>;
  rpcResult?: { data: unknown; error: { message: string } | null };
}): FakeDb {
  const chains: Array<{ table: string; chain: Chain }> = [];
  const from = vi.fn((table: string) => {
    const result = opts.tables?.[table] ?? { data: [], error: null, count: 0 };
    const chain = makeChain(result);
    chains.push({ table, chain });
    return chain;
  });
  const rpc = vi.fn(async () => opts.rpcResult ?? { data: null, error: { message: "down" } });
  const auth = {
    getClaims: async () => ({ data: { claims: opts.claims ?? null }, error: null }),
  };
  return { db: { from, rpc, auth } as unknown as OrdersDb, from, rpc, chains };
}

function adminDb(opts: Omit<Parameters<typeof fakeDb>[0], "claims"> = {}): FakeDb {
  return fakeDb({ ...opts, claims: { sub: "admin-1" } });
}

function callsFor(fake: FakeDb, table: string, method: (typeof CHAIN_METHODS)[number]) {
  return fake.chains
    .filter((entry) => entry.table === table)
    .flatMap((entry) => entry.chain[method].mock.calls as unknown[][]);
}

const ORDER_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  order_number: "KARTI-000101",
  customer_name: "Ahmed B.",
  phone: "+212612345678",
  whatsapp: "+212612345678",
  email: "ahmed@example.com",
  status: "NEW",
  payment_status: "PENDING",
  fulfillment_status: "NOT_STARTED",
  pricing_status: "QUOTE_REQUIRED",
  total_minor: null,
  currency: "MAD",
  first_touch_source: "DIRECT",
  created_at: "2026-09-28T10:00:00.000Z",
  updated_at: "2026-09-28T10:00:00.000Z",
  order_items: [{ product_type: "GOOGLE_REVIEW_CARD", quantity: 2 }],
};

describe("orders service reads", () => {
  it("refuses listOrders without an admin session and never queries", async () => {
    const fake = fakeDb({});
    const result = await listOrders(DEFAULT_ORDERS_QUERY, fake.db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("applies the needs-action predicate server-side", async () => {
    const fake = adminDb({
      tables: { orders: { data: [], error: null, count: 0 } },
    });
    const result = await listOrders({ ...DEFAULT_ORDERS_QUERY, view: "needs-action" }, fake.db);
    expect(result.ok).toBe(true);
    expect(callsFor(fake, "orders", "or")).toContainEqual([needsActionOrFilter()]);
  });

  it("applies ready, filters, search, and pagination server-side", async () => {
    const fake = adminDb({
      tables: { orders: { data: [ORDER_ROW], error: null, count: 1 } },
    });
    const result = await listOrders(
      {
        ...DEFAULT_ORDERS_QUERY,
        view: "ready",
        q: "ahmed",
        page: 2,
        product: "GOOGLE_REVIEW_CARD",
        payment: "PENDING",
        fulfillment: "READY",
        source: "DIRECT",
      },
      fake.db,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.page).toBe(2);
    expect(result.data.totalPages).toBe(1);
    const selectCall = callsFor(fake, "orders", "select")[0][0] as string;
    expect(selectCall).toContain("order_items!inner(product_type,quantity)");
    expect(callsFor(fake, "orders", "eq")).toContainEqual([
      "order_items.product_type",
      "GOOGLE_REVIEW_CARD",
    ]);
    expect(callsFor(fake, "orders", "eq")).toContainEqual(["fulfillment_status", "READY"]);
    expect(callsFor(fake, "orders", "not")).toContainEqual([
      "status",
      "in",
      "(COMPLETED,CANCELLED)",
    ]);
    expect(callsFor(fake, "orders", "range")).toContainEqual([25, 49]);
    const orCalls = callsFor(fake, "orders", "or").flat().join(" ");
    expect(orCalls).toContain("customer_name.ilike.%ahmed%");
    expect(result.data.rows[0]).toMatchObject({
      orderNumber: "KARTI-000101",
      status: "NEW",
      productType: "GOOGLE_REVIEW_CARD",
      quantity: 2,
    });
  });

  it("returns NOT_FOUND for malformed order ids without a query", async () => {
    const fake = adminDb({});
    const result = await getOrderDetail("not-a-uuid", fake.db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("loads detail with items, events, and no linked resources", async () => {
    const fake = adminDb({
      tables: {
        orders: {
          data: { ...ORDER_ROW, client_id: null, internal_notes: "private" },
          error: null,
        },
        order_items: { data: [], error: null },
        order_events: { data: [{ id: "e1", event_type: "ORDER_CREATED" }], error: null },
      },
    });
    const result = await getOrderDetail(ORDER_ROW.id, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.events).toHaveLength(1);
    expect(result.data.client).toBeNull();
    expect(result.data.profiles).toEqual([]);
    expect(result.data.cards).toEqual([]);
    expect(fake.chains.some((entry) => entry.table === "clients")).toBe(false);
  });

  it("resolves linked client, profiles, and cards", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: { ...ORDER_ROW, client_id: "c1" }, error: null },
        order_items: { data: [{ id: "i1", profile_id: "p1" }], error: null },
        order_events: { data: [], error: null },
        clients: { data: { id: "c1", name: "Ahmed", company: "Café X" }, error: null },
        profiles: { data: [{ id: "p1", display_name: "Ahmed", slug: "ahmed" }], error: null },
        order_item_cards: { data: [{ order_item_id: "i1", card_id: "k1" }], error: null },
        cards: {
          data: [{ id: "k1", card_number: "K-1", short_code: "ABC123", status: "ACTIVE" }],
          error: null,
        },
      },
    });
    const result = await getOrderDetail(ORDER_ROW.id, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.client).toEqual({ id: "c1", name: "Ahmed", company: "Café X" });
    expect(result.data.profiles).toEqual([{ id: "p1", displayName: "Ahmed", slug: "ahmed" }]);
    expect(result.data.cards).toEqual([
      { id: "k1", cardNumber: "K-1", shortCode: "ABC123", status: "ACTIVE" },
    ]);
  });

  it("returns summary counts and fails closed on count errors", async () => {
    const fake = adminDb({
      tables: { orders: { data: [], error: null, count: 3 } },
    });
    const result = await getOrdersSummary(fake.db);
    expect(result).toEqual({
      ok: true,
      data: { newCount: 3, needsActionCount: 3, inProgressCount: 3, readyCount: 3 },
    });

    const failing = adminDb({
      tables: { orders: { data: [], error: { message: "boom" }, count: null } },
    });
    const failed = await getOrdersSummary(failing.db);
    expect(failed.ok).toBe(false);
  });

  it("search-escapes LIKE wildcards and or() breakers", () => {
    expect(escapeOrderSearch("100%_x,y(z)")).toBe("100\\%\\_xyz");
  });
});

describe("inquiries service", () => {
  it("lists with status filter and search", async () => {
    const fake = adminDb({
      tables: {
        inquiries: {
          data: [
            {
              id: "i1",
              name: "Sara",
              company: null,
              phone: "+212600000000",
              email: null,
              inquiry_type: "BULK_ORDER",
              message: "Hello",
              status: "NEW",
              source: "DIRECT",
              created_at: "2026-09-28T10:00:00.000Z",
            },
          ],
          error: null,
          count: 1,
        },
      },
    });
    const result = await listInquiries({ q: "sara", page: 1, istatus: "NEW" }, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows[0].status).toBe("NEW");
    expect(callsFor(fake, "inquiries", "eq")).toContainEqual(["status", "NEW"]);
  });

  it("rejects invalid inquiry transitions without a query", async () => {
    const fake = adminDb({});
    const result = await updateInquiryStatus(
      "11111111-1111-4111-8111-111111111111",
      "CLOSED",
      "CONTACTED",
      fake.db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_TRANSITION");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("maps guarded-update misses to conflict vs not-found", async () => {
    const conflicted = adminDb({
      tables: {
        inquiries: { data: { id: "11111111-1111-4111-8111-111111111111" }, error: null },
      },
    });
    // First call (guarded update) returns null; existence check finds a row.
    conflicted.from.mockImplementationOnce(((table: string) => {
      const chain = makeChain({ data: null, error: null });
      conflicted.chains.push({ table, chain });
      return chain;
    }) as never);
    const conflict = await updateInquiryStatus(
      "11111111-1111-4111-8111-111111111111",
      "NEW",
      "CONTACTED",
      conflicted.db,
    );
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe("CONFLICT");
  });
});

describe("orders service mutations", () => {
  const rpcOk = (extra: Record<string, unknown> = {}) => ({
    data: { ok: true, ...extra },
    error: null,
  });

  it("calls the contacted RPC with expected-state args", async () => {
    const fake = adminDb({ rpcResult: rpcOk({ status: "CONTACTED" }) });
    const result = await markOrderContacted(ORDER_ROW.id, "NEW", fake.db);
    expect(result.ok).toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith("admin_mark_order_contacted", {
      p_order_id: ORDER_ROW.id,
      p_expected_status: "NEW",
    });
  });

  it("maps RPC conflict/invalid envelopes to operator messages", async () => {
    const conflicted = adminDb({
      rpcResult: { data: { ok: false, code: "CONFLICT" }, error: null },
    });
    const conflict = await confirmOrder(ORDER_ROW.id, "CONTACTED", conflicted.db);
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe("CONFLICT");
      expect(conflict.error.message).toContain("another session");
    }

    const invalid = adminDb({
      rpcResult: { data: { ok: false, code: "INVALID_TRANSITION" }, error: null },
    });
    const rejected = await completeOrder(ORDER_ROW.id, "IN_PROGRESS", invalid.db);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe("INVALID_TRANSITION");
  });

  it("short-circuits validation without touching the database", async () => {
    const fake = adminDb({});
    expect((await markOrderContacted("bad-id", "NEW", fake.db)).ok).toBe(false);
    expect((await markOrderContacted(ORDER_ROW.id, "CONTACTED", fake.db)).ok).toBe(false);
    expect((await cancelOrder(ORDER_ROW.id, "NEW", "NOPE" as never, null, fake.db)).ok).toBe(false);
    expect(
      (
        await setOrderPrice(
          ORDER_ROW.id,
          "2026-09-28T10:00:00.000Z",
          { subtotalMinor: 1000, deliveryFeeMinor: 0, discountMinor: 1001 },
          fake.db,
        )
      ).ok,
    ).toBe(false);
    expect((await updatePaymentStatus(ORDER_ROW.id, "PENDING", "REFUNDED", fake.db)).ok).toBe(
      false,
    );
    expect((await updateFulfillmentStatus(ORDER_ROW.id, "PRODUCTION", "DESIGN", fake.db)).ok).toBe(
      false,
    );
    expect(
      (
        await updateInternalNote(
          ORDER_ROW.id,
          "2026-09-28T10:00:00.000Z",
          "x".repeat(2001),
          fake.db,
        )
      ).ok,
    ).toBe(false);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("refuses mutations without an admin session", async () => {
    const fake = fakeDb({});
    const result = await markOrderContacted(ORDER_ROW.id, "NEW", fake.db);
    expect(result.ok).toBe(false);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("passes minor-unit quote amounts to the price RPC", async () => {
    const fake = adminDb({ rpcResult: rpcOk({ pricing_status: "PRICED", total_minor: 11500 }) });
    const result = await setOrderPrice(
      ORDER_ROW.id,
      "2026-09-28T10:00:00.000Z",
      { subtotalMinor: 10000, deliveryFeeMinor: 2000, discountMinor: 500 },
      fake.db,
    );
    expect(result.ok).toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith("admin_set_order_price", {
      p_order_id: ORDER_ROW.id,
      p_expected_updated_at: "2026-09-28T10:00:00.000Z",
      p_subtotal_minor: 10000,
      p_delivery_fee_minor: 2000,
      p_discount_minor: 500,
    });
  });

  it("sends cancel reason metadata and note updates through", async () => {
    const fake = adminDb({ rpcResult: rpcOk({ status: "CANCELLED" }) });
    const cancelled = await cancelOrder(ORDER_ROW.id, "NEW", "DUPLICATE", "dup", fake.db);
    expect(cancelled.ok).toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith("admin_cancel_order", {
      p_order_id: ORDER_ROW.id,
      p_expected_status: "NEW",
      p_reason: "DUPLICATE",
      p_note: "dup",
    });

    const noted = await updateCustomerNote(
      ORDER_ROW.id,
      "2026-09-28T10:00:00.000Z",
      "Ring twice",
      fake.db,
    );
    expect(noted.ok).toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith("admin_update_customer_note", {
      p_order_id: ORDER_ROW.id,
      p_expected_updated_at: "2026-09-28T10:00:00.000Z",
      p_note: "Ring twice",
    });
  });
});
