import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  getClientIp,
  isHoneypotFilled,
  isTooFast,
  MIN_FILL_MS,
} from "./antispam";

describe("anti-spam helpers", () => {
  it("flags filled honeypots only", () => {
    expect(isHoneypotFilled("")).toBe(false);
    expect(isHoneypotFilled(undefined)).toBe(false);
    expect(isHoneypotFilled("http://spam.example")).toBe(true);
  });

  it("rejects instant submits and accepts patient ones", () => {
    const now = 1_000_000;
    expect(isTooFast(now - 500, now)).toBe(true);
    expect(isTooFast(now - MIN_FILL_MS - 1, now)).toBe(false);
    expect(isTooFast("yesterday", now)).toBe(true);
    expect(isTooFast(Number.NaN, now)).toBe(true);
  });

  it("token-buckets callers and recovers after the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 1_000).allowed).toBe(true);
    const blocked = limiter.check("ip", 2_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(limiter.check("other", 2_000).allowed).toBe(true);
    expect(limiter.check("ip", 61_001).allowed).toBe(true);
  });

  it("keeps independent buckets separate (pure helper; request path uses the durable limiter)", () => {
    const orders = createRateLimiter({ windowMs: 600_000, max: 5 });
    const inquiries = createRateLimiter({ windowMs: 600_000, max: 10 });
    for (let i = 0; i < 5; i += 1) {
      expect(orders.check("k", i).allowed).toBe(true);
    }
    expect(orders.check("k", 5).allowed).toBe(false);
    expect(inquiries.check("k", 5).allowed).toBe(true);
  });

  it("extracts the first forwarded IP without storing it", () => {
    expect(getClientIp("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
    expect(getClientIp(null)).toBe("unknown");
    expect(getClientIp("   ")).toBe("unknown");
  });
});
