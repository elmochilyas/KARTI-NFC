/**
 * Order-detail delivery-Sheet status (small operational badge + Resync).
 * No credentials, no raw error internals — a short hint at most.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { resyncOrderToSheetAction, type DeliverySyncBadgeState } from "../actions";

function badgeStatus(state: DeliverySyncBadgeState): string {
  switch (state.status) {
    case "SYNCED":
      return "SYNCED";
    case "FAILED":
      return "FAILED";
    case "PENDING":
      return "PENDING";
    default:
      return "NOT_TRACKED";
  }
}

export function DeliverySheetSection({
  orderId,
  initial,
}: {
  orderId: string;
  initial: DeliverySyncBadgeState | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!initial) return null;
  const showResync = initial.status === "FAILED" || initial.status === "NOT_TRACKED";

  function resync() {
    setFeedback(null);
    startTransition(async () => {
      const result = await resyncOrderToSheetAction(orderId);
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <Section title="Delivery Sheet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={badgeStatus(initial)} />
          {initial.status === "FAILED" && initial.lastError ? (
            <p className="max-w-full truncate text-sm text-muted" title={initial.lastError}>
              {initial.lastError}
            </p>
          ) : null}
        </div>
        {showResync ? (
          <button
            type="button"
            onClick={resync}
            disabled={pending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Syncing…" : "Resync"}
          </button>
        ) : null}
      </div>
      {feedback ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
          {feedback}
        </p>
      ) : null}
    </Section>
  );
}
