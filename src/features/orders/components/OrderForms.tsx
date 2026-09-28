/**
 * Order detail mutations (client components). Every form calls a server
 * action, shows typed feedback, and refreshes server state on success —
 * never optimistic, never silent.
 */
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  FULFILLMENT_TRANSITIONS,
  humanizeStatusValue,
  INQUIRY_STATUSES,
  INQUIRY_TRANSITIONS,
  ORDER_CANCEL_REASONS,
  orderCancelReasonLabel,
  PAYMENT_TRANSITIONS,
} from "@/domain/orders";
import type { FulfillmentStatus, InquiryStatus, PaymentStatus } from "@/domain/orders";
import {
  cancelOrderAction,
  completeOrderAction,
  confirmOrderAction,
  markContactedAction,
  setPriceAction,
  updateCustomerNoteAction,
  updateFulfillmentAction,
  updateInquiryStatusAction,
  updateInternalNoteAction,
  updatePaymentAction,
  type OrderActionState,
} from "../actions";
import type { InquiryListItem } from "../types";

function useOrderMutation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OrderActionState | null>(null);

  function submit(work: () => Promise<OrderActionState>) {
    setState(null);
    startTransition(async () => {
      const result = await work();
      setState(result);
      if (result.ok) router.refresh();
    });
  }

  return { pending, state, submit };
}

function MutationFeedback({ state }: { state: OrderActionState | null }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} aria-live="polite" className="text-sm">
      {state.ok ? (
        <span className="text-success">{state.message}</span>
      ) : (
        <span className="text-danger">{state.message}</span>
      )}
    </p>
  );
}

export function MutationButton({
  label,
  run,
  variant = "primary",
}: {
  label: string;
  run: () => Promise<OrderActionState>;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending, state, submit } = useOrderMutation();
  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} loading={pending} onClick={() => submit(run)}>
        {label}
      </Button>
      <MutationFeedback state={state} />
    </div>
  );
}

export function MarkContactedButton({
  orderId,
  expectedStatus,
}: {
  orderId: string;
  expectedStatus: string;
}) {
  return (
    <MutationButton
      label="Mark contacted"
      run={() => markContactedAction(orderId, expectedStatus)}
    />
  );
}

export function ConfirmOrderButton({
  orderId,
  expectedStatus,
}: {
  orderId: string;
  expectedStatus: string;
}) {
  return (
    <MutationButton label="Confirm order" run={() => confirmOrderAction(orderId, expectedStatus)} />
  );
}

export function CompleteOrderButton({
  orderId,
  expectedStatus,
}: {
  orderId: string;
  expectedStatus: string;
}) {
  return (
    <MutationButton
      label="Mark completed"
      run={() => completeOrderAction(orderId, expectedStatus)}
    />
  );
}

export function CancelOrderDialog({
  orderId,
  expectedStatus,
}: {
  orderId: string;
  expectedStatus: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending, state, submit } = useOrderMutation();
  const [reason, setReason] = useState<string>(ORDER_CANCEL_REASONS[0]);
  const [note, setNote] = useState("");

  function open() {
    setReason(ORDER_CANCEL_REASONS[0]);
    setNote("");
    try {
      dialogRef.current?.showModal();
    } catch {
      // Dialog unsupported — the inline button below still cancels nothing;
      // operator can retry in a supported browser.
    }
  }

  return (
    <>
      <Button variant="danger" onClick={open}>
        Cancel order
      </Button>
      <dialog
        ref={dialogRef}
        aria-label="Cancel order"
        className="w-[calc(100vw-2rem)] max-w-md rounded-xl border border-border bg-surface p-5 backdrop:bg-black/50"
        onCancel={() => dialogRef.current?.close()}
      >
        <h2 className="text-lg font-bold">Cancel this order?</h2>
        <p className="mt-1 text-sm text-muted">
          The order and its history are preserved. Linked client, profile, or card records are never
          deleted.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          action={() =>
            submit(async () => {
              const result = await cancelOrderAction(
                orderId,
                expectedStatus,
                reason,
                note.trim() === "" ? null : note,
              );
              if (result.ok) dialogRef.current?.close();
              return result;
            })
          }
        >
          <Field id="cancel-reason" label="Reason">
            <Select
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {ORDER_CANCEL_REASONS.map((value) => (
                <option key={value} value={value}>
                  {orderCancelReasonLabel(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="cancel-note"
            label="Note (optional)"
            hint="Stored with the cancellation event."
          >
            <Textarea
              id="cancel-note"
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <MutationFeedback state={state} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Keep order
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              Confirm cancellation
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function minorToDecimalInput(minor: number | null): string {
  if (minor === null) return "";
  return String(minor / 100);
}

export function QuoteForm({
  orderId,
  expectedUpdatedAt,
  current,
}: {
  orderId: string;
  expectedUpdatedAt: string;
  current: {
    subtotalMinor: number | null;
    deliveryFeeMinor: number | null;
    discountMinor: number | null;
  };
}) {
  const { pending, state, submit } = useOrderMutation();
  const [subtotal, setSubtotal] = useState(minorToDecimalInput(current.subtotalMinor));
  const [delivery, setDelivery] = useState(minorToDecimalInput(current.deliveryFeeMinor));
  const [discount, setDiscount] = useState(minorToDecimalInput(current.discountMinor ?? 0));

  return (
    <form
      className="flex flex-col gap-3"
      action={() =>
        submit(() => setPriceAction(orderId, expectedUpdatedAt, subtotal, delivery, discount))
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field id="quote-subtotal" label="Subtotal (MAD)">
          <Input
            id="quote-subtotal"
            name="subtotal"
            inputMode="decimal"
            autoComplete="off"
            value={subtotal}
            onChange={(event) => setSubtotal(event.target.value)}
          />
        </Field>
        <Field id="quote-delivery" label="Delivery (MAD)">
          <Input
            id="quote-delivery"
            name="delivery"
            inputMode="decimal"
            autoComplete="off"
            value={delivery}
            onChange={(event) => setDelivery(event.target.value)}
          />
        </Field>
        <Field id="quote-discount" label="Discount (MAD)">
          <Input
            id="quote-discount"
            name="discount"
            inputMode="decimal"
            autoComplete="off"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </Field>
      </div>
      <MutationFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Save quote
        </Button>
      </div>
    </form>
  );
}

export function PaymentForm({
  orderId,
  expectedPayment,
}: {
  orderId: string;
  expectedPayment: PaymentStatus;
}) {
  const targets = PAYMENT_TRANSITIONS[expectedPayment];
  const { pending, state, submit } = useOrderMutation();
  const [target, setTarget] = useState<string>(targets[0] ?? "");
  if (targets.length === 0) return null;

  return (
    <form
      className="flex flex-col gap-3"
      action={() => submit(() => updatePaymentAction(orderId, expectedPayment, target))}
    >
      <Field id="payment-target" label="New payment status">
        <Select
          id="payment-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {targets.map((value) => (
            <option key={value} value={value}>
              {humanizeStatusValue(value)}
            </option>
          ))}
        </Select>
      </Field>
      <MutationFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Update payment
        </Button>
      </div>
    </form>
  );
}

export function FulfillmentForm({
  orderId,
  expectedFulfillment,
}: {
  orderId: string;
  expectedFulfillment: FulfillmentStatus;
}) {
  const targets = FULFILLMENT_TRANSITIONS[expectedFulfillment];
  const { pending, state, submit } = useOrderMutation();
  const [target, setTarget] = useState<string>(targets[0] ?? "");
  if (targets.length === 0) return null;

  return (
    <form
      className="flex flex-col gap-3"
      action={() => submit(() => updateFulfillmentAction(orderId, expectedFulfillment, target))}
    >
      <Field id="fulfillment-target" label="Next fulfillment step">
        <Select
          id="fulfillment-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {targets.map((value) => (
            <option key={value} value={value}>
              {humanizeStatusValue(value)}
            </option>
          ))}
        </Select>
      </Field>
      <MutationFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Move fulfillment
        </Button>
      </div>
    </form>
  );
}

export function NoteForm({
  orderId,
  expectedUpdatedAt,
  kind,
  initialValue,
}: {
  orderId: string;
  expectedUpdatedAt: string;
  kind: "internal" | "customer";
  initialValue: string | null;
}) {
  const { pending, state, submit } = useOrderMutation();
  const [note, setNote] = useState(initialValue ?? "");
  const maxLength = kind === "internal" ? 2000 : 1000;

  return (
    <form
      className="flex flex-col gap-3"
      action={() =>
        submit(() =>
          kind === "internal"
            ? updateInternalNoteAction(orderId, expectedUpdatedAt, note)
            : updateCustomerNoteAction(orderId, expectedUpdatedAt, note),
        )
      }
    >
      <Field
        id={`${kind}-note`}
        label={kind === "internal" ? "Internal note" : "Customer note"}
        hint={
          kind === "internal"
            ? "Operator-only. Never shown to customers; only an update flag is logged."
            : "Customer requirements for this order."
        }
      >
        <Textarea
          id={`${kind}-note`}
          value={note}
          maxLength={maxLength}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <MutationFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Save note
        </Button>
      </div>
    </form>
  );
}

function inquiryLabel(status: string): string {
  return INQUIRY_STATUSES.includes(status as InquiryStatus)
    ? status.charAt(0) + status.slice(1).toLowerCase()
    : status;
}

export function InquiryCard({ inquiry }: { inquiry: InquiryListItem }) {
  const [expanded, setExpanded] = useState(false);
  const { pending, state, submit } = useOrderMutation();
  const current = INQUIRY_STATUSES.includes(inquiry.status as InquiryStatus)
    ? (inquiry.status as InquiryStatus)
    : null;
  const targets = current ? INQUIRY_TRANSITIONS[current] : [];
  const preview =
    inquiry.message.length > 140 ? `${inquiry.message.slice(0, 140)}…` : inquiry.message;

  return (
    <li className="rounded-xl border border-border bg-surface px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {inquiry.name}
            {inquiry.company ? ` · ${inquiry.company}` : ""}
          </span>
          <span className="block truncate text-xs text-muted">{preview}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-border px-2.5 py-0.5">
            {inquiryLabel(inquiry.status)}
          </span>
          <span aria-hidden="true" className="text-muted">
            {expanded ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-sm">
          <p className="whitespace-pre-wrap break-words">{inquiry.message}</p>
          <dl className="flex flex-col gap-1 text-sm">
            {inquiry.phone ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Phone</dt>
                <dd>
                  <a className="underline" href={`tel:${inquiry.phone}`}>
                    {inquiry.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {inquiry.email ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Email</dt>
                <dd className="min-w-0 truncate">
                  <a className="underline" href={`mailto:${inquiry.email}`}>
                    {inquiry.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {inquiry.inquiryType ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Type</dt>
                <dd>{humanizeStatusValue(inquiry.inquiryType)}</dd>
              </div>
            ) : null}
            {inquiry.source ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Source</dt>
                <dd>{humanizeStatusValue(inquiry.source)}</dd>
              </div>
            ) : null}
          </dl>
          {targets.length > 0 && current ? (
            <div className="flex flex-wrap gap-2">
              {targets.map((target) => (
                <Button
                  key={target}
                  variant="secondary"
                  loading={pending}
                  onClick={() =>
                    submit(() => updateInquiryStatusAction(inquiry.id, current, target))
                  }
                >
                  Mark {inquiryLabel(target).toLowerCase()}
                </Button>
              ))}
            </div>
          ) : null}
          <MutationFeedback state={state} />
        </div>
      ) : null}
    </li>
  );
}
