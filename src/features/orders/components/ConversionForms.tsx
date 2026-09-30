/**
 * Phase 4 conversion & provisioning UI (client components). The operator
 * always decides: candidates are suggestions, provisioning is a
 * deliberate action, conflicts explain instead of overwriting.
 */
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { clientMatchReasonLabel } from "@/domain/orders";
import {
  convertOrderAction,
  findClientCandidatesAction,
  provisionOrderCardsAction,
  resolveReviewDestinationAction,
} from "../actions";
import type { ClientCandidate } from "../types";
import { MutationFeedback, useOrderMutation } from "./OrderForms";

export function ConvertClientDialog({
  orderId,
  expectedStatus,
}: {
  orderId: string;
  expectedStatus: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending, state, submit } = useOrderMutation();
  const [candidates, setCandidates] = useState<ClientCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function open() {
    setCandidates(null);
    setLoadError(null);
    setLoading(true);
    try {
      dialogRef.current?.showModal();
    } catch {
      setLoading(false);
      return;
    }
    const result = await findClientCandidatesAction(orderId);
    setLoading(false);
    if (result.ok) {
      setCandidates(result.candidates);
    } else {
      setLoadError(result.message);
    }
  }

  function choose(clientId: string | null, mode: "existing" | "new") {
    submit(async () => {
      const result = await convertOrderAction(orderId, expectedStatus, mode, clientId);
      if (result.ok) dialogRef.current?.close();
      return result;
    });
  }

  return (
    <>
      <Button variant="primary" onClick={open}>
        Convert to client
      </Button>
      <dialog
        ref={dialogRef}
        aria-label="Convert order to client"
        className="w-[calc(100vw-2rem)] max-w-md rounded-xl border border-border bg-surface p-5 backdrop:bg-black/50"
        onCancel={() => dialogRef.current?.close()}
      >
        <h2 className="text-lg font-bold">Convert to client</h2>
        <p className="mt-1 text-sm text-muted">
          Link this order to an existing client or create a new one. Nothing is chosen
          automatically.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              Searching existing clients…
            </p>
          ) : null}
          {loadError ? (
            <p role="alert" className="text-sm text-danger">
              {loadError}
            </p>
          ) : null}
          {candidates !== null && candidates.length === 0 && !loading ? (
            <p className="text-sm text-muted">
              No existing client matches this order. Create a new one below.
            </p>
          ) : null}
          {candidates !== null && candidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {candidate.name}
                      {candidate.company ? ` · ${candidate.company}` : ""}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[candidate.phone, candidate.email].filter(Boolean).join(" · ")}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {candidate.matchReasons.map(clientMatchReasonLabel).join(" · ")}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    loading={pending}
                    onClick={() => choose(candidate.id, "existing")}
                  >
                    Use this client
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <MutationFeedback state={state} />
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button variant="primary" loading={pending} onClick={() => choose(null, "new")}>
              Create new client
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function ProvisionCardsPanel({
  orderId,
  itemId,
  expectedFulfillment,
  required,
  linked,
  remaining,
  destinationMissing,
}: {
  orderId: string;
  itemId: string;
  expectedFulfillment: string;
  required: number;
  linked: number;
  remaining: number;
  destinationMissing: boolean;
}) {
  const { pending, state, submit } = useOrderMutation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted" aria-live="polite">
        Required: {required} · Already linked: {linked} · Remaining: {remaining}
      </p>
      {destinationMissing ? (
        <p className="text-sm text-warning">
          Destination required — resolve the destination above before provisioning.
        </p>
      ) : (
        <div>
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              submit(() => provisionOrderCardsAction(orderId, itemId, expectedFulfillment))
            }
          >
            {remaining === 1 ? "Provision 1 card" : `Provision ${remaining} cards`}
          </Button>
        </div>
      )}
      <MutationFeedback state={state} />
    </div>
  );
}

export function ReviewUrlResolver({
  orderId,
  itemId,
  expectedItemUpdatedAt,
  currentUrl,
}: {
  orderId: string;
  itemId: string;
  expectedItemUpdatedAt: string;
  currentUrl: string | null;
}) {
  const { pending, state, submit } = useOrderMutation();
  const [url, setUrl] = useState(currentUrl ?? "");

  return (
    <form
      className="flex flex-col gap-2"
      action={() =>
        submit(() => resolveReviewDestinationAction(orderId, itemId, expectedItemUpdatedAt, url))
      }
    >
      <Field
        id={`review-url-${itemId}`}
        label="Google review URL"
        hint="Validated HTTPS link. Saved into the order with an audit event."
      >
        <Input
          id={`review-url-${itemId}`}
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>
      <MutationFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Save review URL
        </Button>
      </div>
    </form>
  );
}
