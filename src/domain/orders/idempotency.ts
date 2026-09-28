/**
 * Idempotency contract foundation (specs/specs-vitrin/03 §15).
 *
 * Phase 1 establishes the key type/validation + unique database support
 * (migration) + the documented primitive shape. The actual atomic
 * Order + OrderItem + ORDER_CREATED transaction lands in Phase 2 — Phase 1
 * deliberately does NOT fake atomicity with multiple independent inserts.
 */

import { z } from "zod";

export const idempotencyKeySchema = z.string().uuid({
  message: "Idempotency key must be a UUID.",
});

export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;

export function isIdempotencyKey(value: unknown): value is IdempotencyKey {
  return idempotencyKeySchema.safeParse(value).success;
}

/**
 * Phase 2 primitive contract (documented here so UI/server work has a
 * stable shape to target):
 *
 * - wizard generates an opaque UUID before final submit;
 * - server checks orders.idempotency_key UNIQUE;
 * - repeated submission with the same key returns the existing receipt;
 * - Order + OrderItem + ORDER_CREATED are created in ONE transaction.
 */
export type IdempotentOrderRequest = {
  idempotencyKey: IdempotencyKey;
};
