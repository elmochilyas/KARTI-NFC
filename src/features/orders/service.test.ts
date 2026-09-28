import { describe, expect, it, vi } from "vitest";
import { needsActionOrFilter } from "@/domain/orders";
import {
  cancelOrder,
  completeOrder,
  confirmOrder,
  convertOrder,
  escapeOrderSearch,
  findClientCandidates,
  getOrderDetail,
  getOrdersSummary,
  listInquiries,
  listOrders,
  markOrderContacted,
  provisionOrderCards,
  resolveReviewDestination,
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
    expect(result.data.profiles).toEqual([
      { id: "p1", displayName: "Ahmed", slug: "ahmed", profileType: undefined, status: undefined },
    ]);
    expect(result.data.linkedCardCounts).toEqual({ i1: 1 });
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

const CONVERT_SNAPSHOT = {
  id: "22222222-2222-4222-8222-222222222222",
  status: "CONFIRMED",
  client_id: null,
  customer_name: "Ahmed Benali",
  phone: "+212612345678",
  email: "ahmed@example.com",
};

describe("conversion service", () => {
  it("finds exact phone/email candidates and ranks both-match first", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: CONVERT_SNAPSHOT, error: null },
        clients: {
          data: [
            {
              id: "c1",
              name: "Ahmed B.",
              company: null,
              phone: "+212612345678",
              email: "other@example.com",
            },
            {
              id: "c2",
              name: "Ahmed Benali",
              company: "Café",
              phone: "+212600000000",
              email: "ahmed@example.com",
            },
            { id: "c3", name: "Unrelated", company: null, phone: null, email: null },
          ],
          error: null,
        },
      },
    });
    // Fakes do not apply ilike: scope the name-recall query to c1/c2.
    const baseImpl = fake.from.getMockImplementation() as (table: string) => unknown;
    let clientCalls = 0;
    fake.from.mockImplementation(((table: string) => {
      if (table === "clients") {
        clientCalls += 1;
        if (clientCalls === 2) {
          const chain = makeChain({ data: [{ id: "c1" }, { id: "c2" }], error: null });
          fake.chains.push({ table, chain });
          return chain;
        }
      }
      return baseImpl(table);
    }) as never);
    const result = await findClientCandidates(CONVERT_SNAPSHOT.id, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // c1 phone-only, c2 email+name; c3 excluded.
    expect(result.data.map((candidate) => candidate.id)).toEqual(["c1", "c2"]);
    expect(result.data[0].matchReasons).toContain("PHONE");
    expect(result.data[1].matchReasons).toContain("EMAIL");
  });

  it("finds exact matches beyond the first 100 clients", async () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      id: `c-${index}`,
      name: `P4X Person ${index}`,
      company: null,
      phone: `+21260000${1000 + index}`,
      email: `p4x${index}@example.com`,
    }));
    const targetPhone = "+212600001120";
    const targetEmail = "p4x120@example.com";
    const fake = adminDb({
      tables: {
        orders: {
          data: {
            ...CONVERT_SNAPSHOT,
            customer_name: "P4X Person 120",
            phone: targetPhone,
            email: targetEmail,
          },
          error: null,
        },
      },
    });
    const baseImpl = fake.from.getMockImplementation() as (table: string) => unknown;
    fake.from.mockImplementation(((table: string) => {
      if (table !== "clients") return baseImpl(table);
      let sliceFrom = 0;
      let sliceTo = rows.length;
      let orUsed = false;
      const chain = makeChain({ data: [], error: null });
      chain.range = vi.fn((fromIdx: number, toIdx: number) => {
        sliceFrom = fromIdx;
        sliceTo = toIdx + 1;
        return chain;
      });
      chain.or = vi.fn(() => {
        orUsed = true;
        return chain;
      });
      chain.then = (resolve: (value: TableResult) => void) =>
        Promise.resolve({
          data: orUsed ? [] : rows.slice(sliceFrom, sliceTo),
          error: null,
        }).then(resolve);
      fake.chains.push({ table, chain });
      return chain;
    }) as never);

    const result = await findClientCandidates(CONVERT_SNAPSHOT.id, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((candidate) => candidate.id)).toEqual(["c-120"]);
    expect(result.data[0].matchReasons).toEqual(expect.arrayContaining(["PHONE", "EMAIL"]));
    // 150 rows fit one 500-row page: single range call, no cutoff.
    const ranges = callsFor(fake, "clients", "range");
    expect(ranges).toEqual([[0, 499]]);
  });

  it("pages past the first scan window for far-out matches", async () => {
    const rows = Array.from({ length: 600 }, (_, index) => ({
      id: `d-${index}`,
      name: `P4Y Person ${index}`,
      company: null,
      phone: `+21261111${String(1000 + index).slice(-4)}`,
      email: `p4y${index}@example.com`,
    }));
    const fake = adminDb({
      tables: {
        orders: {
          data: {
            ...CONVERT_SNAPSHOT,
            customer_name: "P4Y Person 550",
            phone: "+212611111550",
            email: "p4y550@example.com",
          },
          error: null,
        },
      },
    });
    const baseImpl = fake.from.getMockImplementation() as (table: string) => unknown;
    fake.from.mockImplementation(((table: string) => {
      if (table !== "clients") return baseImpl(table);
      let sliceFrom = 0;
      let sliceTo = rows.length;
      let orUsed = false;
      const chain = makeChain({ data: [], error: null });
      chain.range = vi.fn((fromIdx: number, toIdx: number) => {
        sliceFrom = fromIdx;
        sliceTo = toIdx + 1;
        return chain;
      });
      chain.or = vi.fn(() => {
        orUsed = true;
        return chain;
      });
      chain.then = (resolve: (value: TableResult) => void) =>
        Promise.resolve({
          data: orUsed ? [] : rows.slice(sliceFrom, sliceTo),
          error: null,
        }).then(resolve);
      fake.chains.push({ table, chain });
      return chain;
    }) as never);

    const result = await findClientCandidates(CONVERT_SNAPSHOT.id, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Name recall isolated away: the exact phone/email hit at index 550
    // is found purely by the paged scan loop.
    expect(result.data.map((candidate) => candidate.id)).toEqual(["d-550"]);
    expect(result.data[0].matchReasons).toEqual(expect.arrayContaining(["PHONE", "EMAIL"]));
    expect(callsFor(fake, "clients", "range")).toEqual([
      [0, 499],
      [500, 999],
    ]);
  });

  it("refuses conversion from non-convertible states without an RPC", async () => {
    const fake = adminDb({});
    const result = await convertOrder(ORDER_ROW.id, "NEW", "new", null, fake.db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_TRANSITION");
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("returns the existing relation when already linked", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: { ...CONVERT_SNAPSHOT, client_id: "client-9" }, error: null },
      },
    });
    const result = await convertOrder(CONVERT_SNAPSHOT.id, "CONFIRMED", "new", null, fake.db);
    expect(result).toEqual({
      ok: true,
      data: { converted: false, clientId: "client-9", profileId: null, profileCreated: false },
    });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("converts to a new client with a generated slug and no client-id key", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: CONVERT_SNAPSHOT, error: null },
        order_items: {
          data: [{ product_type: "BUSINESS_CARD", configuration: { businessName: "Café X" } }],
          error: null,
        },
        profiles: { data: [], error: null },
      },
      rpcResult: {
        data: {
          ok: true,
          converted: true,
          client_id: "c-new",
          profile_id: "p-new",
          profile_created: true,
        },
        error: null,
      },
    });
    const result = await convertOrder(CONVERT_SNAPSHOT.id, "CONFIRMED", "new", null, fake.db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      converted: true,
      clientId: "c-new",
      profileId: "p-new",
      profileCreated: true,
    });
    const args = fake.rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_mode).toBe("new");
    expect(args.p_profile_slug).toBe("ahmed-benali");
    expect("p_client_id" in args).toBe(false);
    expect(args.p_client_company).toBe("Café X");
  });

  it("retries once on SLUG_TAKEN with a fresh slug", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: CONVERT_SNAPSHOT, error: null },
        order_items: {
          data: [{ product_type: "PERSONAL_CARD", configuration: { fullName: "Ahmed Benali" } }],
          error: null,
        },
        profiles: { data: [], error: null },
      },
    });
    fake.rpc
      .mockResolvedValueOnce({ data: { ok: false, code: "SLUG_TAKEN" }, error: null })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          converted: true,
          client_id: "c1",
          profile_id: "p1",
          profile_created: true,
        },
        error: null,
      });
    const result = await convertOrder(CONVERT_SNAPSHOT.id, "CONFIRMED", "new", null, fake.db);
    expect(result.ok).toBe(true);
    expect(fake.rpc).toHaveBeenCalledTimes(2);
    const firstSlug = (fake.rpc.mock.calls[0][1] as Record<string, unknown>).p_profile_slug;
    const secondSlug = (fake.rpc.mock.calls[1][1] as Record<string, unknown>).p_profile_slug;
    expect(firstSlug).toBe("ahmed-benali");
    expect(secondSlug).not.toBe("ahmed-benali");
  });

  it("maps PROFILE_CONFLICT to an operator-safe message", async () => {
    const fake = adminDb({
      tables: {
        orders: { data: CONVERT_SNAPSHOT, error: null },
        order_items: {
          data: [{ product_type: "PERSONAL_CARD", configuration: { fullName: "Ahmed" } }],
          error: null,
        },
        profiles: { data: [], error: null },
      },
      rpcResult: {
        data: { ok: false, code: "PROFILE_CONFLICT", existing_profile_type: "BUSINESS" },
        error: null,
      },
    });
    const result = await convertOrder(
      CONVERT_SNAPSHOT.id,
      "CONFIRMED",
      "existing",
      "33333333-3333-4333-8333-333333333333",
      fake.db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_CONFLICT");
      expect(result.error.message).toContain("Business profile");
    }
  });
});

describe("provisioning service", () => {
  const PROVISION_ORDER = {
    id: "44444444-4444-4444-8444-444444444444",
    status: "CONFIRMED",
    fulfillment_status: "NFC_CONFIGURATION",
    client_id: "client-1",
  };
  const PROFILE_ITEM = {
    id: "55555555-5555-4555-8555-555555555555",
    quantity: 2,
    product_type: "PERSONAL_CARD",
    configuration: { fullName: "Ahmed" },
    profile_id: "profile-1",
  };

  function provisionDb(item: unknown, links: unknown[], rpcResult: unknown) {
    return adminDb({
      tables: {
        orders: { data: PROVISION_ORDER, error: null },
        order_items: { data: item, error: null },
        order_item_cards: { data: links, error: null },
      },
      rpcResult: rpcResult as { data: unknown; error: { message: string } | null },
    });
  }

  it("provisions remaining cards with generated codes and no url key", async () => {
    const fake = provisionDb(PROFILE_ITEM, [], {
      data: { ok: true, provisioned: 2, card_ids: ["k1", "k2"] },
      error: null,
    });
    const result = await provisionOrderCards(
      PROVISION_ORDER.id,
      PROFILE_ITEM.id,
      "NFC_CONFIGURATION",
      fake.db,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ provisioned: 2, cardIds: ["k1", "k2"] });
    const args = fake.rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_profile_id).toBe("profile-1");
    expect("p_destination_url" in args).toBe(false);
    expect(args.p_short_codes as string[]).toHaveLength(2);
    for (const code of args.p_short_codes as string[]) {
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("short-circuits fully provisioned items without an RPC", async () => {
    const fake = provisionDb(PROFILE_ITEM, [{ card_id: "k1" }, { card_id: "k2" }], null);
    const result = await provisionOrderCards(
      PROVISION_ORDER.id,
      PROFILE_ITEM.id,
      "NFC_CONFIGURATION",
      fake.db,
    );
    expect(result).toEqual({ ok: true, data: { provisioned: 0, cardIds: [] } });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rejects unlinked orders and wrong fulfillment states", async () => {
    const unlinked = adminDb({
      tables: {
        orders: { data: { ...PROVISION_ORDER, client_id: null }, error: null },
      },
    });
    const rejected = await provisionOrderCards(
      PROVISION_ORDER.id,
      PROFILE_ITEM.id,
      "NFC_CONFIGURATION",
      unlinked.db,
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe("INVALID_TRANSITION");

    const wrongState = provisionDb(PROFILE_ITEM, [], null);
    const stale = await provisionOrderCards(
      PROVISION_ORDER.id,
      PROFILE_ITEM.id,
      "PRODUCTION",
      wrongState.db,
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("CONFLICT");
  });

  it("blocks unresolved Google destinations without an RPC", async () => {
    const fake = provisionDb(
      {
        id: PROFILE_ITEM.id,
        quantity: 1,
        product_type: "GOOGLE_REVIEW_CARD",
        configuration: { businessName: "Café X", needsUrlHelp: true },
        profile_id: null,
      },
      [],
      null,
    );
    const result = await provisionOrderCards(
      PROVISION_ORDER.id,
      PROFILE_ITEM.id,
      "NFC_CONFIGURATION",
      fake.db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DESTINATION_REQUIRED");
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("resolves review URLs through the atomic RPC", async () => {
    const fake = adminDb({
      rpcResult: { data: { ok: true, url: "https://g.page/x/review" }, error: null },
    });
    const result = await resolveReviewDestination(
      PROFILE_ITEM.id,
      "2026-09-28T10:00:00.000Z",
      "https://g.page/x/review",
      fake.db,
    );
    expect(result).toEqual({ ok: true, data: { url: "https://g.page/x/review" } });
    expect(fake.rpc).toHaveBeenCalledWith("admin_resolve_order_destination", {
      p_order_item_id: PROFILE_ITEM.id,
      p_expected_item_updated_at: "2026-09-28T10:00:00.000Z",
      p_review_url: "https://g.page/x/review",
    });
  });

  it("rejects unsafe review URLs without touching the database", async () => {
    const fake = adminDb({});
    const result = await resolveReviewDestination(
      PROFILE_ITEM.id,
      "2026-09-28T10:00:00.000Z",
      "javascript:alert(1)",
      fake.db,
    );
    expect(result.ok).toBe(false);
    expect(fake.rpc).not.toHaveBeenCalled();
  });
});
