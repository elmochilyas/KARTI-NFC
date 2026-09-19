import type { ReactNode } from "react";
import { Button } from "./Button";

function StateShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-6 py-8 text-center shadow-[var(--shadow-card)]">
      <p className="text-base font-semibold text-text">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-8">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className="rounded-lg border border-border bg-surface px-4 py-2"
    >
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col divide-y divide-border" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="karti-skeleton h-10 w-10 shrink-0 rounded-full bg-surface-muted" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="karti-skeleton h-3.5 w-2/5 rounded bg-surface-muted" />
              <div className="karti-skeleton h-3 w-3/5 rounded bg-surface-muted" />
            </div>
            <div className="karti-skeleton h-8 w-16 shrink-0 rounded-md bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading form"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-4" aria-hidden="true">
        <div className="karti-skeleton h-4 w-1/3 rounded bg-surface-muted" />
        <div className="karti-skeleton h-11 w-full rounded-md bg-surface-muted" />
        <div className="karti-skeleton h-4 w-1/4 rounded bg-surface-muted" />
        <div className="karti-skeleton h-11 w-full rounded-md bg-surface-muted" />
        <div className="karti-skeleton h-11 w-40 rounded-md bg-surface-muted" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StateShell title={title} description={description}>
      {action}
    </StateShell>
  );
}

export function ErrorState({
  title = "Something went wrong.",
  description = "Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateShell title={title} description={description}>
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </StateShell>
  );
}
