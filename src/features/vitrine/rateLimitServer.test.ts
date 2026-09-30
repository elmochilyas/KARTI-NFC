import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/orderWriter", () => ({
  createOrderWriterClient: () => ({ rpc: rpcMock }),
}));

const SECRET = "test-rate-limit-secret-32-chars-min";

beforeEach(() => {
  process.env.RATE_LIMIT_SECRET = SECRET;
  rpcMock.mockReset();
});

import {
  checkPublicRateLimit,
  deriveRateLimitKeyHash,
  INQUIRY_RATE_LIMIT_MAX,
  ORDER_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECS,
} from "./rateLimitServer";
import { getRateLimitSecret } from "@/lib/env-server";

describe("durable rate limiting", () => {
  it("keeps the Phase 2 budgets (orders 5, inquiries 10 per 10 minutes)", () => {
    expect(ORDER_RATE_LIMIT_MAX).toBe(5);
    expect(INQUIRY_RATE_LIMIT_MAX).toBe(10);
    expect(RATE_LIMIT_WINDOW_SECS).toBe(600);
  });

  it("derives a stable non-reversible key hash per IP and action", () => {
    const first = deriveRateLimitKeyHash("1.2.3.4", "order");
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveRateLimitKeyHash("1.2.3.4", "order")).toBe(first);
    // Action isolation: order and inquiry budgets never share a key.
    expect(deriveRateLimitKeyHash("1.2.3.4", "inquiry")).not.toBe(first);
    // Caller isolation.
    expect(deriveRateLimitKeyHash("5.6.7.8", "order")).not.toBe(first);
    // The raw IP is not recoverable from the stored key.
    expect(first).not.toContain("1.2.3.4");
  });

  it("normalizes equivalent IP spellings to the same key", () => {
    expect(deriveRateLimitKeyHash("  1.2.3.4 ", "order")).toBe(
      deriveRateLimitKeyHash("1.2.3.4", "order"),
    );
  });

  it("fails closed without a configured secret", () => {
    delete process.env.RATE_LIMIT_SECRET;
    expect(() => getRateLimitSecret()).toThrow();
    expect(() => deriveRateLimitKeyHash("1.2.3.4", "order")).toThrow();
    process.env.RATE_LIMIT_SECRET = SECRET;
  });

  it("passes the HMAC key hash (never the raw IP) to the atomic RPC", async () => {
    rpcMock.mockResolvedValue({
      data: { allowed: true, count: 1, retry_after_secs: 0 },
      error: null,
    });
    const verdict = await checkPublicRateLimit("order", "9.9.9.9");
    expect(verdict).toEqual({ allowed: true });
    expect(rpcMock.mock.calls[0][0]).toBe("check_rate_limit");
    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_action).toBe("order");
    expect(args.p_max).toBe(5);
    expect(args.p_window_secs).toBe(600);
    expect(args.p_key_hash).toBe(deriveRateLimitKeyHash("9.9.9.9", "order"));
    expect(JSON.stringify(args)).not.toContain("9.9.9.9");
  });

  it("uses the inquiry budget for inquiry actions", async () => {
    rpcMock.mockResolvedValue({
      data: { allowed: true, count: 3, retry_after_secs: 0 },
      error: null,
    });
    await checkPublicRateLimit("inquiry", "9.9.9.9");
    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_action).toBe("inquiry");
    expect(args.p_max).toBe(10);
  });

  it("surfaces durable denials with a retry delay", async () => {
    rpcMock.mockResolvedValue({
      data: { allowed: false, count: 6, retry_after_secs: 45 },
      error: null,
    });
    const verdict = await checkPublicRateLimit("order", "9.9.9.9");
    expect(verdict).toEqual({ allowed: false, retryAfterMs: 45_000 });
  });

  it("throws on RPC failure so callers fail closed", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "conn reset" } });
    await expect(checkPublicRateLimit("order", "9.9.9.9")).rejects.toThrow();
  });

  it("throws on unexpected RPC shapes instead of allowing silently", async () => {
    rpcMock.mockResolvedValue({ data: [{ allowed: true }], error: null });
    await expect(checkPublicRateLimit("order", "9.9.9.9")).rejects.toThrow();
  });
});
