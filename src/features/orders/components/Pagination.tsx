import Link from "next/link";
import type { OrdersQuery } from "../params";
import { buildOrdersUrl } from "../urls";

export function Pagination({ query, totalPages }: { query: OrdersQuery; totalPages: number }) {
  if (totalPages <= 1) return null;
  const prev = query.page > 1 ? buildOrdersUrl(query, { page: query.page - 1 }) : null;
  const next = query.page < totalPages ? buildOrdersUrl(query, { page: query.page + 1 }) : null;
  return (
    <nav aria-label="Orders pages" className="flex items-center justify-between gap-3">
      {prev ? (
        <Link
          href={prev}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium"
        >
          ← Previous
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm text-muted"
        >
          ← Previous
        </span>
      )}
      <p aria-live="polite" className="text-sm text-muted">
        Page {query.page} of {totalPages}
      </p>
      {next ? (
        <Link
          href={next}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium"
        >
          Next →
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm text-muted"
        >
          Next →
        </span>
      )}
    </nav>
  );
}
