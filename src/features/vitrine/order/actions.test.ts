import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => null })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

const { rpcMock, catalogRow } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  catalogRow: { value: { published: true, price_minor: 19900 } as unknown },
}));
vi.mock("@/lib/supabase/orderWriter", () => ({
  createOrderWriterClient: () => ({ rpc: rpcMock }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
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
  catalogRow.value = { published: true, price_minor: 19900 };
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
