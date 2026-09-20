"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/features/cards/components/CopyButton";
import { createNfcWriter, type NfcWriteFailureReason } from "@/features/nfc/writer";

type NfcUiState =
  | { stage: "idle" }
  | { stage: "writing" }
  | { stage: "success" }
  | { stage: "unsupported" }
  | { stage: "denied" | "cancelled" | "failed" };

const FRIENDLY_ERROR: Record<Exclude<NfcWriteFailureReason, "UNSUPPORTED">, string> = {
  PERMISSION_DENIED:
    "NFC access was not allowed. Try again and allow NFC access when your browser asks.",
  CANCELLED: "Write cancelled before it finished.",
  WRITE_FAILED:
    "We couldn't write this NFC card. Make sure NFC is enabled, the card is held close to the NFC area, the tag is writable, and you keep it still until writing finishes.",
};

/**
 * Physical NFC write control. Explicit tap only (no auto-trigger), no
 * navigation while pending, button locked during writes. The success state
 * is local only — no durable "written" flag is stored (ADR-025).
 */
export function WriteToNfc({
  permanentUrl,
  label = "Write to NFC",
}: {
  permanentUrl: string;
  label?: string;
}) {
  const [state, setState] = useState<NfcUiState>({ stage: "idle" });
  const [pending, startTransition] = useTransition();
  const writing = state.stage === "writing" || pending;

  function startWrite() {
    const writer = createNfcWriter();
    if (!writer.isSupported()) {
      setState({ stage: "unsupported" });
      return;
    }
    setState({ stage: "writing" });
    startTransition(async () => {
      const result = await writer.writeUrl(permanentUrl);
      if (result.ok) {
        setState({ stage: "success" });
      } else if (result.reason === "UNSUPPORTED") {
        setState({ stage: "unsupported" });
      } else if (result.reason === "PERMISSION_DENIED") {
        setState({ stage: "denied" });
      } else if (result.reason === "CANCELLED") {
        setState({ stage: "cancelled" });
      } else {
        setState({ stage: "failed" });
      }
    });
  }

  function retry() {
    setState({ stage: "idle" });
  }

  if (state.stage === "success") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm font-semibold text-text">NFC card programmed ✓</p>
        <p className="text-sm text-muted">Permanent Karti link written successfully.</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={permanentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface px-4 text-sm font-medium text-text hover:bg-border"
          >
            Test Card
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={retry}>
            Done
          </Button>
        </div>
        <p className="text-sm text-muted">
          Now tap the physical card with another phone to confirm it opens. Destination changes
          never need a rewrite.
        </p>
      </div>
    );
  }

  if (state.stage === "unsupported") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm font-semibold text-text">NFC writing isn&apos;t available here</p>
        <p className="text-sm text-muted">
          This browser can&apos;t write NFC tags. You can still program the card using any NFC
          writer app.
        </p>
        <p className="break-all font-mono text-sm text-muted">{permanentUrl}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={permanentUrl} label="Copy URL" />
          <Button type="button" variant="ghost" size="sm" onClick={retry}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (state.stage === "denied" || state.stage === "cancelled" || state.stage === "failed") {
    const reason =
      state.stage === "denied"
        ? ("PERMISSION_DENIED" as const)
        : state.stage === "cancelled"
          ? ("CANCELLED" as const)
          : ("WRITE_FAILED" as const);
    const message = FRIENDLY_ERROR[reason];
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm font-semibold text-text">
          {state.stage === "cancelled" ? "Write cancelled" : "NFC write didn&apos;t complete"}
        </p>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={startWrite} disabled={writing}>
            Try Again
          </Button>
          <CopyButton value={permanentUrl} label="Copy URL Instead" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.stage === "writing" ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-surface-muted p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent"
            />
            Writing NFC card…
          </p>
          <p className="mt-1 text-sm text-muted">
            Hold the Karti card near your phone. Keep it in place until writing finishes.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Needs a browser with NFC support. Hold the card near your phone when asked — nothing
          happens until you tap the button.
        </p>
      )}
      {state.stage === "idle" ? (
        <div>
          <Button type="button" onClick={startWrite} disabled={writing}>
            {label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
