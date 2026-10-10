import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => null })),
  headers: vi.fn(async () => ({ get: () => null })),
}));
vi.mock("next/server", () => ({
  after: (...args: unknown[]) => afterMock(...(args as [])),
}));
vi.mock("@/features/integrations/google-sheets/sync", () => ({
  ensurePendingSyncRow: (...args: unknown[]) => ensurePendingSyncRowMock(...(args as [])),
  syncOrderToDeliverySheet: (...args: unknown[]) => syncOrderToDeliverySheetMock(...(args as [])),
}));

const { rpcMock, catalogRow, afterMock, ensurePendingSyncRowMock, syncOrderToDeliverySheetMock } =
  vi.hoisted(() => ({
    rpcMock: vi.fn(),
    catalogRow: { value: { published: true, price_minor: 19900 } as unknown },
    afterMock: vi.fn(),
    ensurePendingSyncRowMock: vi.fn(),
    syncOrderToDeliverySheetMock: vi.fn(),
  }));
vi.mock("@/lib/supabase/orderWriter", () => ({
  createOrderWriterClient: () => ({ rpc: rpcMock }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            // The delivery-sheet mirror reads the created order row by
            // order number after the RPC commits; catalog reads stay on
            // catalog_products. Branching keeps both paths testable.
            if (table === "orders") {
              return { data: { id: "order-id-1" }, error: null };
            }
            if (catalogRow.value instanceof Error) throw catalogRow.value;
            return { data: catalogRow.value, error: null };
          },
        }),
      }),
    }),
  }),
}));

import { createPublicInquiryAction, createPublicOrderAction } from "./actions";

process.env.RECEIPT_TOKEN_SECRET = "test-receipt-secret-32-chars-minimum";
process.env.RATE_LIMIT_SECRET = "test-rate-limit-secret-32-chars-min";

const BASE_ORDER = {
  locale: "fr",
  productType: "PERSONAL_CARD",
  quantity: 1,
  configuration: { fullName: "Younes Barrag" },
  customer: {
    fullName: "Younes Barrag",
    phone: "0612345678",
    whatsapp: "0612345678",
    email: "",
    preferredContact: "WHATSAPP",
  },
  delivery: { city: "Casablanca", address: "12 rue Test", instructions: "" },
  idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
  website: "",
  startedAt: Date.now() - 60_000,
};

const ALLOW_LIMIT = { allowed: true, count: 1, retry_after_secs: 0 };
const DENY_LIMIT = { allowed: false, count: 6, retry_after_secs: 30 };

/** Routes the durable rate-limit RPC vs the order/inquiry RPCs. */
function mockRpc(orderImpl: () => { data: unknown; error: unknown }) {
  rpcMock.mockImplementation((fn: string) => {
    if (fn === "check_rate_limit") return Promise.resolve({ data: ALLOW_LIMIT, error: null });
    return Promise.resolve(orderImpl());
  });
}

function orderSuccess() {
  mockRpc(() => ({ data: [{ order_number: "KARTI-000010", created: true }], error: null }));
}

function createCalls(fn: string): Record<string, unknown>[] {
  return rpcMock.mock.calls
    .filter((call) => (call as unknown[])[0] === fn)
    .map((call) => (call as unknown[])[1] as Record<string, unknown>);
}

beforeEach(() => {
  rpcMock.mockReset();
  afterMock.mockReset();
  ensurePendingSyncRowMock.mockReset();
  syncOrderToDeliverySheetMock.mockReset();
  ensurePendingSyncRowMock.mockResolvedValue(undefined);
  syncOrderToDeliverySheetMock.mockResolvedValue(undefined);
  catalogRow.value = { published: true, price_minor: 19900 };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env.RECEIPT_TOKEN_SECRET = "test-receipt-secret-32-chars-minimum";
  process.env.RATE_LIMIT_SECRET = "test-rate-limit-secret-32-chars-min";
});

describe("createPublicOrderAction", () => {
  it("creates through the atomic RPC with server-derived pricing", async () => {
    orderSuccess();
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.orderNumber).toBe("KARTI-000010");
    expect(result.data.receiptToken).toMatch(/^[0-9a-f]{64}$/);

    // Durable rate limit runs first with an HMAC key hash (no raw IP).
    const limitCalls = createCalls("check_rate_limit");
    expect(limitCalls).toHaveLength(1);
    expect(limitCalls[0].p_action).toBe("order");
    expect(limitCalls[0].p_max).toBe(5);
    expect(limitCalls[0].p_window_secs).toBe(600);
    expect(limitCalls[0].p_key_hash).toMatch(/^[0-9a-f]{64}$/);

    const orderCalls = createCalls("create_public_order");
    expect(orderCalls).toHaveLength(1);
    const args = orderCalls[0];
    // Server snapshots the live catalog price: unit 19900 × qty 1.
    expect(args.p_unit_price_minor).toBe(19900);
    expect(args.p_line_total_minor).toBe(19900);
    expect(args.p_subtotal_minor).toBe(19900);
    expect(args.p_delivery_fee_minor).toBe(0);
    expect(args.p_discount_minor).toBe(0);
    expect(args.p_total_minor).toBe(19900);
    expect("p_pricing_status" in args).toBe(false); // pricing-guard-allow: pricing_status
    expect(args.p_configuration).toEqual({ fullName: "Younes Barrag" });
    expect(args.p_phone_normalized).toBe("+212612345678");
    expect(args.p_receipt_token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores browser-supplied prices (strict input, server snapshot wins)", async () => {
    orderSuccess();
    const result = await createPublicOrderAction({
      ...BASE_ORDER,
      quantity: 2,
      unitPriceMinor: 1,
      totalMinor: 1,
    } as unknown as typeof BASE_ORDER);
    // Unknown fields are rejected by the strict schema; the snapshot path
    // never reads browser amounts.
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("refuses orders while the product price is not configured", async () => {
    orderSuccess();
    catalogRow.value = { published: true, price_minor: null };
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("fails honestly when the catalog is unreachable", async () => {
    orderSuccess();
    catalogRow.value = new Error("db down");
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("rejects malformed input without touching the order RPC", async () => {
    orderSuccess();
    const result = await createPublicOrderAction({ ...BASE_ORDER, quantity: 0 });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("rejects mismatched product configuration", async () => {
    orderSuccess();
    const result = await createPublicOrderAction({
      ...BASE_ORDER,
      productType: "WHATSAPP_CARD",
      configuration: { fullName: "Younes" },
    });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("treats honeypot fills and instant submits as spam", async () => {
    orderSuccess();
    expect(await createPublicOrderAction({ ...BASE_ORDER, website: "bot" })).toEqual({
      ok: false,
      error: { code: "SPAM" },
    });
    expect(await createPublicOrderAction({ ...BASE_ORDER, startedAt: Date.now() })).toEqual({
      ok: false,
      error: { code: "SPAM" },
    });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("rate-limits abusive callers through the durable limiter", async () => {
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "check_rate_limit") return Promise.resolve({ data: DENY_LIMIT, error: null });
      return Promise.resolve({
        data: [{ order_number: "KARTI-000011", created: true }],
        error: null,
      });
    });
    const limited = await createPublicOrderAction(BASE_ORDER);
    expect(limited).toEqual({ ok: false, error: { code: "RATE_LIMITED" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("fails closed when the rate limiter itself errors", async () => {
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "check_rate_limit")
        return Promise.resolve({ data: null, error: { message: "conn reset" } });
      return Promise.resolve({
        data: [{ order_number: "KARTI-000011", created: true }],
        error: null,
      });
    });
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("maps RPC failures to unavailable without leaking internals", async () => {
    mockRpc(() => ({ data: null, error: { message: "23514 boom" } }));
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("fails closed with UNAVAILABLE when RATE_LIMIT_SECRET is missing (never touches the order RPC)", async () => {
    // Production incident 2026-10-09 (karti.pro): no RATE_LIMIT_SECRET in
    // the environment meant every submission failed before pricing/RPC
    // with the generic French submitFailed message, zero order rows, and
    // zero Postgres/Vercel log signal. The limiter must never be skipped.
    orderSuccess();
    const saved = process.env.RATE_LIMIT_SECRET;
    delete process.env.RATE_LIMIT_SECRET;
    try {
      const result = await createPublicOrderAction(BASE_ORDER);
      expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
      expect(createCalls("create_public_order")).toHaveLength(0);
      expect(console.error).toHaveBeenCalledWith(
        "[createPublicOrderAction] rate limiter unavailable:",
        expect.stringContaining("RATE_LIMIT_SECRET"),
      );
    } finally {
      if (saved === undefined) delete process.env.RATE_LIMIT_SECRET;
      else process.env.RATE_LIMIT_SECRET = saved;
    }
  });

  it("fails closed with UNAVAILABLE when RECEIPT_TOKEN_SECRET is missing (never touches the order RPC)", async () => {
    orderSuccess();
    const saved = process.env.RECEIPT_TOKEN_SECRET;
    delete process.env.RECEIPT_TOKEN_SECRET;
    try {
      const result = await createPublicOrderAction(BASE_ORDER);
      expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
      expect(createCalls("create_public_order")).toHaveLength(0);
      expect(console.error).toHaveBeenCalledWith(
        "[createPublicOrderAction] receipt unavailable:",
        expect.stringContaining("RECEIPT_TOKEN_SECRET"),
      );
    } finally {
      if (saved === undefined) delete process.env.RECEIPT_TOKEN_SECRET;
      else process.env.RECEIPT_TOKEN_SECRET = saved;
    }
  });

  it("snapshots quantity multiplication from the server catalog price", async () => {
    orderSuccess();
    const result = await createPublicOrderAction({ ...BASE_ORDER, quantity: 2 });
    expect(result.ok).toBe(true);
    const orderCalls = createCalls("create_public_order");
    expect(orderCalls).toHaveLength(1);
    // Catalog 19900 MAD minor × 2: unit stays fixed, totals scale.
    expect(orderCalls[0].p_unit_price_minor).toBe(19900);
    expect(orderCalls[0].p_line_total_minor).toBe(39800);
    expect(orderCalls[0].p_subtotal_minor).toBe(39800);
    expect(orderCalls[0].p_delivery_fee_minor).toBe(0);
    expect(orderCalls[0].p_discount_minor).toBe(0);
    expect(orderCalls[0].p_total_minor).toBe(39800);
  });

  it("accepts the reported production payload shape (PERSONAL_CARD × 1, Agadir)", async () => {
    // Regression for the 2026-10-09 karti.pro report: this exact customer
    // shape must pass server validation so that, with secrets + catalog
    // price configured, it reaches the RPC instead of failing early.
    orderSuccess();
    const result = await createPublicOrderAction({
      locale: "fr",
      productType: "PERSONAL_CARD",
      quantity: 1,
      configuration: { fullName: "test order" },
      customer: {
        fullName: "ilyas elmoch",
        phone: "0603755677",
        whatsapp: "0603755677",
        email: "elmochilyas@gmail.com",
        preferredContact: "WHATSAPP",
      },
      delivery: {
        city: "Agadir",
        address: "Jet Sakan , Hay Salam , Agadir , Maroc",
        instructions: "",
      },
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174001",
      website: "",
      startedAt: Date.now() - 60_000,
    });
    expect(result.ok).toBe(true);
    const orderCalls = createCalls("create_public_order");
    expect(orderCalls).toHaveLength(1);
    expect(orderCalls[0].p_phone_normalized).toBe("+212603755677");
    expect(orderCalls[0].p_city).toBe("Agadir");
  });

  it("starts the delivery-sheet mirror only after a committed order", async () => {
    orderSuccess();
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    // PENDING row persisted synchronously for the created order id…
    expect(ensurePendingSyncRowMock).toHaveBeenCalledTimes(1);
    expect(ensurePendingSyncRowMock).toHaveBeenCalledWith("order-id-1");
    // …and the Google transport deferred to after() with the same id.
    expect(afterMock).toHaveBeenCalledTimes(1);
    const deferred = afterMock.mock.calls[0][0] as () => void;
    deferred();
    await Promise.resolve();
    expect(syncOrderToDeliverySheetMock).toHaveBeenCalledTimes(1);
    expect(syncOrderToDeliverySheetMock).toHaveBeenCalledWith("order-id-1");
  });

  it("never touches the delivery-sheet mirror when order creation fails", async () => {
    mockRpc(() => ({ data: null, error: { message: "conn reset" } }));
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
    expect(ensurePendingSyncRowMock).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
    expect(syncOrderToDeliverySheetMock).not.toHaveBeenCalled();
  });

  it("returns the SAME working receipt token on idempotent retry", async () => {
    // First call commits; second call hits the idempotency path.
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "check_rate_limit") return Promise.resolve({ data: ALLOW_LIMIT, error: null });
      const calls = createCalls("create_public_order").length;
      return Promise.resolve({
        data: [{ order_number: "KARTI-000010", created: calls === 0 }],
        error: null,
      });
    });
    const first = await createPublicOrderAction(BASE_ORDER);
    const retry = await createPublicOrderAction(BASE_ORDER);
    expect(first.ok && retry.ok).toBe(true);
    if (!first.ok || !retry.ok) throw new Error("expected ok");
    expect(retry.data.orderNumber).toBe("KARTI-000010");
    // Same derived credential: the retry receipt actually resolves.
    expect(retry.data.receiptToken).toBe(first.data.receiptToken);
    const orderCalls = createCalls("create_public_order");
    expect(orderCalls).toHaveLength(2);
    expect(orderCalls[1].p_receipt_token_hash).toBe(orderCalls[0].p_receipt_token_hash);
  });
});

describe("createPublicInquiryAction", () => {
  const BASE_INQUIRY = {
    locale: "fr",
    name: "Salma",
    phone: "",
    email: "",
    company: "",
    inquiryType: "GENERAL",
    message: "Bonjour, une question.",
    website: "",
    startedAt: Date.now() - 60_000,
  };

  it("creates inquiries only (never orders)", async () => {
    mockRpc(() => ({ data: "inquiry-uuid-1", error: null }));
    const result = await createPublicInquiryAction(BASE_INQUIRY);
    expect(result.ok).toBe(true);
    const limitCalls = createCalls("check_rate_limit");
    expect(limitCalls).toHaveLength(1);
    expect(limitCalls[0].p_action).toBe("inquiry");
    expect(limitCalls[0].p_max).toBe(10);
    const inquiryCalls = createCalls("create_public_inquiry");
    expect(inquiryCalls).toHaveLength(1);
    expect(inquiryCalls[0].p_message).toBe("Bonjour, une question.");
    expect(inquiryCalls[0].p_inquiry_type).toBe("GENERAL");
    expect(createCalls("create_public_order")).toHaveLength(0);
  });

  it("validates name and message", async () => {
    mockRpc(() => ({ data: "inquiry-uuid-1", error: null }));
    expect(await createPublicInquiryAction({ ...BASE_INQUIRY, name: "  " })).toEqual({
      ok: false,
      error: { code: "VALIDATION" },
    });
    expect(await createPublicInquiryAction({ ...BASE_INQUIRY, message: "" })).toEqual({
      ok: false,
      error: { code: "VALIDATION" },
    });
    expect(createCalls("create_public_inquiry")).toHaveLength(0);
  });
});
