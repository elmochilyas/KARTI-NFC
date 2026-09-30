/**
 * Anti-spam building blocks for public mutations (spec 07 §11).
 *
 * Layers: server validation (Zod/domain) + honeypot + submission-timing
 * gate + durable Postgres rate limiting
 * (src/features/vitrine/rateLimitServer.ts) + idempotency. No CAPTCHA.
 * Raw IPs are transient only — hashed server-side into the rate-limit key
 * and never persisted on business rows. `createRateLimiter` below remains
 * as a pure, unit-tested helper but is no longer on the request path.
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

/** First X-Forwarded-For entry; transient rate-limit key only. */
export function getClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "unknown";
  const first = forwardedFor.split(",")[0].trim().slice(0, 100);
  return first === "" ? "unknown" : first;
}
