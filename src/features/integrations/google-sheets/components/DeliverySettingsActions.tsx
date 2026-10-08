/**
 * Settings → Delivery Sheet operational actions (client island).
 *
 * Test connection, Setup Sheet, Sync unsynced orders. No credential
 * fields, no secrets, no URLs — configuration lives exclusively in
 * server environment variables.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  bulkSyncUnsentOrdersAction,
  runDeliverySheetSetupAction,
  testDeliveryConnectionAction,
  type DeliverySheetActionState,
} from "../actions";

export function DeliverySettingsActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  function run(action: () => Promise<DeliverySheetActionState>, markConnected: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback(result.message);
      if (result.ok) {
        if (markConnected) setConnected(true);
        router.refresh();
      } else if (markConnected) {
        setConnected(false);
      }
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {connected ? (
        <p role="status" aria-live="polite" className="text-sm font-medium text-text">
          Connected ✓
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => run(testDeliveryConnectionAction, true)}
          disabled={pending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Testing…" : "Test connection"}
        </button>
        <button
          type="button"
          onClick={() => run(runDeliverySheetSetupAction, false)}
          disabled={pending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working…" : "Setup Sheet"}
        </button>
        <button
          type="button"
          onClick={() => run(bulkSyncUnsentOrdersAction, false)}
          disabled={pending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working…" : "Sync unsynced orders"}
        </button>
      </div>
      {feedback ? (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
