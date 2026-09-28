import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => null })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/orderWriter", () => ({
  createOrderWriterClient: () => ({ rpc: rpcMock }),
}));

import { orderRateLimiter } from "../antispam";
import { createPublicInquiryAction, createPublicOrderAction } from "./actions";

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

beforeEach(() => {
  rpcMock.mockReset();
  orderRateLimiter.clear();
});

describe("createPublicOrderAction", () => {
  it("creates through the atomic RPC with server-derived pricing", async () => {
    rpcMock.mockResolvedValue({
      data: [{ order_number: "KARTI-000010", created: true }],
      error: null,
    });
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.orderNumber).toBe("KARTI-000010");
    expect(result.data.receiptToken).toMatch(/^[0-9a-f]{64}$/);

    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(rpcMock.mock.calls[0][0]).toBe("create_public_order");
    expect(args.p_pricing_status).toBe("QUOTE_REQUIRED");
    expect(args.p_total_minor).toBeNull();
    expect(args.p_configuration).toEqual({ fullName: "Younes Barrag" });
    expect(args.p_phone_normalized).toBe("+212612345678");
    expect(args.p_receipt_token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects malformed input without touching the database", async () => {
    const result = await createPublicOrderAction({ ...BASE_ORDER, quantity: 0 });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched product configuration", async () => {
    const result = await createPublicOrderAction({
      ...BASE_ORDER,
      productType: "WHATSAPP_CARD",
      configuration: { fullName: "Younes" },
    });
    expect(result).toEqual({ ok: false, error: { code: "VALIDATION" } });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("treats honeypot fills and instant submits as spam", async () => {
    expect(await createPublicOrderAction({ ...BASE_ORDER, website: "bot" })).toEqual({
      ok: false,
      error: { code: "SPAM" },
    });
    expect(await createPublicOrderAction({ ...BASE_ORDER, startedAt: Date.now() })).toEqual({
      ok: false,
      error: { code: "SPAM" },
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rate-limits abusive callers", async () => {
    rpcMock.mockResolvedValue({
      data: [{ order_number: "KARTI-000011", created: true }],
      error: null,
    });
    for (let i = 0; i < 5; i += 1) {
      await createPublicOrderAction({
        ...BASE_ORDER,
        idempotencyKey: `123e4567-e89b-12d3-a456-42661417400${i}`,
      });
    }
    const limited = await createPublicOrderAction({
      ...BASE_ORDER,
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174009",
    });
    expect(limited).toEqual({ ok: false, error: { code: "RATE_LIMITED" } });
    expect(rpcMock).toHaveBeenCalledTimes(5);
  });

  it("maps RPC failures to unavailable without leaking internals", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "23514 boom" } });
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
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
    rpcMock.mockResolvedValue({ data: "inquiry-uuid-1", error: null });
    const result = await createPublicInquiryAction(BASE_INQUIRY);
    expect(result.ok).toBe(true);
    expect(rpcMock.mock.calls[0][0]).toBe("create_public_inquiry");
    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_message).toBe("Bonjour, une question.");
    expect(args.p_inquiry_type).toBe("GENERAL");
  });

  it("validates name and message", async () => {
    expect(await createPublicInquiryAction({ ...BASE_INQUIRY, name: "  " })).toEqual({
      ok: false,
      error: { code: "VALIDATION" },
    });
    expect(await createPublicInquiryAction({ ...BASE_INQUIRY, message: "" })).toEqual({
      ok: false,
      error: { code: "VALIDATION" },
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
