/**
 * Anti-spam building blocks for public mutations (spec 07 §11).
 *
 * Layers: server validation (Zod/domain) + honeypot + submission-timing
 * gate + per-IP token bucket + idempotency. No CAPTCHA. Raw IPs are used
 * transiently for rate limiting only — never persisted on business rows.
 *
 * Deployment note: the bucket lives in process memory. On serverless
 * hosts each instance keeps its own counters, so a distributed flood can
 * partially bypass it. It still stops casual double-submits, naive bots,
 * and single-instance abuse; a durable (Redis/Upstash) limiter is the
 * documented Phase 6 upgrade path, not invented here.
 */

export const MIN_FILL_MS = 3000;

/** Honeypot must stay empty; bots fill it, humans never see it. */
export function isHoneypotFilled(website: unknown): boolean {
  return typeof website === "string" && website !== "";
}

/** Rejects instant-bot submits while never blocking legit users. */
export function isTooFast(startedAt: unknown, nowMs: number): boolean {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return true;
  return nowMs - startedAt < MIN_FILL_MS;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * In-memory token bucket. Pure logic with injectable time — unit-tested;
 * production singletons below.
 */
export function createRateLimiter(args: { windowMs: number; max: number }) {
  const { windowMs, max } = args;
  const hits = new Map<string, number[]>();
  return {
    check(key: string, nowMs: number): RateLimitDecision {
      const since = nowMs - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > since);
      if (recent.length >= max) {
        const oldest = Math.min(...recent);
        return { allowed: false, retryAfterMs: oldest + windowMs - nowMs };
      }
      recent.push(nowMs);
      if (hits.size > 10000) hits.clear();
      hits.set(key, recent);
      return { allowed: true };
    },
    /** Test/maintenance hook. */
    clear(): void {
      hits.clear();
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// 5 order submits / 10 min / IP; 10 inquiries / 10 min / IP.
export const orderRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });
export const inquiryRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

/** First X-Forwarded-For entry; transient rate-limit key only. */
export function getClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "unknown";
  const first = forwardedFor.split(",")[0].trim().slice(0, 100);
  return first === "" ? "unknown" : first;
}
