"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import {
  assignCardAction,
  setCardStatusAction,
  setDestinationAction,
  unassignCardAction,
  type CardActionState,
} from "@/app/dashboard/cards/actions";
import { Input } from "@/components/ui/Input";
import { CARD_STATUSES } from "@/features/cards/schema";

const EMPTY: CardActionState = { ok: false, message: "" };

function useCardMutation(operation: (formData: FormData) => Promise<CardActionState>): {
  message: string | null;
  success: boolean;
  pending: boolean;
  submit: (formData: FormData) => void;
} {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return {
    message,
    success,
    pending,
    submit: (formData: FormData) => {
      setMessage(null);
      setSuccess(false);
      startTransition(async () => {
        const result = await operation(formData);
        setMessage(result.message);
        setSuccess(result.ok);
        if (result.ok) router.refresh();
      });
    },
  };
}

export function AssignCardForm({
  cardId,
  clients,
}: {
  cardId: string;
  clients: { id: string; name: string }[];
}) {
  const { message, success, pending, submit } = useCardMutation((formData) =>
    assignCardAction(cardId, EMPTY, formData),
  );
  return (
    <form action={submit} className="flex flex-col gap-3">
      <Field id={`assign-${cardId}`} label="Assign to client">
        <Select name="client_id" required defaultValue="">
          <option value="" disabled>
            Choose a client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      {message ? (
        <p
          role={success ? "status" : "alert"}
          className={`text-sm ${success ? "text-muted" : "font-medium text-danger"}`}
        >
          {message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" loading={pending}>
          {pending ? "Assigning…" : "Assign card"}
        </Button>
      </div>
    </form>
  );
}

/** Pick an existing unassigned card and attach it to a known client. */
export function AssignExistingCardForm({
  clientId,
  cards,
}: {
  clientId: string;
  cards: { id: string; card_number: string; short_code: string }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (cards.length === 0) return null;

  return (
    <form
      action={(formData) => {
        const cardId = String(formData.get("card_id") ?? "");
        if (!cardId) return;
        const assignData = new FormData();
        assignData.set("client_id", clientId);
        setMessage(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await assignCardAction(cardId, EMPTY, assignData);
          setMessage(result.message);
          setSuccess(result.ok);
          if (result.ok) router.refresh();
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-44 flex-1">
        <label htmlFor={`assign-existing-${clientId}`} className="sr-only">
          Choose an unassigned card
        </label>
        <Select id={`assign-existing-${clientId}`} name="card_id" defaultValue="">
          <option value="">Choose a card…</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.card_number} · {c.short_code}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : "Assign Card"}
      </Button>
      {message ? (
        <p
          role={success ? "status" : "alert"}
          className={`w-full text-sm ${success ? "text-muted" : "font-medium text-danger"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function UnassignCardButton({ cardId }: { cardId: string }) {
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!armed) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setArmed(true)}>
        Unassign card
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unassignCardAction(cardId);
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
      >
        {pending ? "…" : "Confirm unassign"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setArmed(false)}>
        Cancel
      </Button>
      {message ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function DestinationForm({
  cardId,
  clientId,
  profile,
  current,
}: {
  cardId: string;
  clientId: string | null;
  profile: { id: string; slug: string; display_name: string; status: string } | null;
  current: { type: string | null; profileId: string | null; url: string | null };
}) {
  const [kind, setKind] = useState<"PROFILE" | "EXTERNAL_URL">(
    current.type === "EXTERNAL_URL" ? "EXTERNAL_URL" : "PROFILE",
  );
  const { message, success, pending, submit } = useCardMutation((formData) =>
    setDestinationAction(cardId, clientId, EMPTY, formData),
  );

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Destination type" className="flex gap-2">
        {(["PROFILE", "EXTERNAL_URL"] as const).map((option) => (
          <label
            key={option}
            className={`radio-card inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium ${
              kind === option ? "border-accent text-text" : "border-border text-muted"
            }`}
          >
            <input
              type="radio"
              name="destination_type"
              value={option}
              checked={kind === option}
              onChange={() => setKind(option)}
              className="sr-only"
            />
            {option === "PROFILE" ? "Karti Profile" : "External URL"}
          </label>
        ))}
      </div>

      {kind === "PROFILE" ? (
        profile ? (
          <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm">
            <input type="hidden" name="profile_id" value={profile.id} />
            <p className="font-medium text-text">{profile.display_name}</p>
            <p className="text-muted">
              /{profile.slug} · {profile.status}
            </p>
            {!clientId ? (
              <p className="mt-1 text-muted">
                Assign the card to this profile&apos;s client first.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {clientId
              ? "This client has no profile yet. Create one from the client page first."
              : "Assign the card to a client first, then choose their profile."}
          </p>
        )
      ) : (
        <Field id={`dest-url-${cardId}`} label="External URL" hint="Safe http(s) URLs only.">
          <Input
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://instagram.com/…"
            defaultValue={current.type === "EXTERNAL_URL" ? (current.url ?? "") : ""}
          />
        </Field>
      )}

      {message ? (
        <p
          role={success ? "status" : "alert"}
          className={`text-sm ${success ? "text-muted" : "font-medium text-danger"}`}
        >
          {message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" loading={pending}>
          {pending ? "Saving…" : "Save Destination"}
        </Button>
      </div>
    </form>
  );
}

export function StatusForm({ cardId, current }: { cardId: string; current: string }) {
  const { message, pending, submit } = useCardMutation((formData) =>
    setCardStatusAction(cardId, EMPTY, formData),
  );
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1">
        <label htmlFor={`status-${cardId}`} className="text-sm font-medium text-text">
          Status
        </label>
        <Select id={`status-${cardId}`} name="status" defaultValue={current} className="mt-1">
          {CARD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Set Status"}
      </Button>
      {message ? (
        <p role="status" className="w-full text-sm text-muted">
          {message}
        </p>
      ) : null}
    </form>
  );
}
