import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createCardAction } from "./actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listCards } from "@/features/cards/service";
import { CARD_STATUSES } from "@/features/cards/schema";
import type { CardSummary } from "@/features/cards/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cards" };

const DESTINATION_OPTIONS = [
  { value: "", label: "All destinations" },
  { value: "PROFILE", label: "Profile" },
  { value: "EXTERNAL_URL", label: "External URL" },
  { value: "NONE", label: "No destination" },
] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function destinationLabel(card: CardSummary): string {
  if (card.destination_type === "PROFILE") return "Profile";
  if (card.destination_type === "EXTERNAL_URL") return "External link";
  return "No destination";
}

function CardRows({ cards }: { cards: CardSummary[] }) {
  return (
    <>
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">Karti physical cards</caption>
        <thead>
          <tr className="border-b border-border text-left text-sm text-muted">
            <th scope="col" className="py-2 pr-4 font-medium">
              Card
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Owner
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Destination
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Status
            </th>
            <th scope="col" className="py-2 font-medium">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-text">{card.card_number}</p>
                <p className="font-mono text-sm text-muted">
                  {card.short_code} · {formatDate(card.created_at)}
                </p>
              </td>
              <td className="py-3 pr-4 text-sm text-muted">{card.clients?.name ?? "Unassigned"}</td>
              <td className="py-3 pr-4 text-sm text-muted">{destinationLabel(card)}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={card.status} />
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-accent hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col divide-y divide-border md:hidden">
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              href={`/dashboard/cards/${card.id}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-text">{card.card_number}</span>
                <span className="block truncate text-sm text-muted">
                  {[card.clients?.name ?? "Unassigned", destinationLabel(card)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <StatusBadge status={card.status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

type CardsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; destination?: string; error?: string }>;
};

function isStatusFilter(value: string | undefined): value is (typeof CARD_STATUSES)[number] {
  return (
    value === "UNASSIGNED" ||
    value === "ASSIGNED" ||
    value === "ACTIVE" ||
    value === "DISABLED" ||
    value === "LOST" ||
    value === "REPLACED"
  );
}

function isDestinationFilter(
  value: string | undefined,
): value is "PROFILE" | "EXTERNAL_URL" | "NONE" | "" {
  return (
    value === undefined ||
    value === "" ||
    value === "PROFILE" ||
    value === "EXTERNAL_URL" ||
    value === "NONE"
  );
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = isStatusFilter(params.status) ? params.status : undefined;
  const destination = isDestinationFilter(params.destination) ? (params.destination ?? "") : "";

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cards" subtitle="Physical card inventory and diagnostics." />
        <ErrorState
          title="Card management is not configured."
          description="Add Supabase keys to .env.local to load cards."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const result = await listCards({ query: q, status, destination }, supabase);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cards" subtitle="Physical card inventory and diagnostics." />
        <ErrorState title="Could not load cards." description={result.error.message} />
      </div>
    );
  }

  const cards = result.data;
  const searching = q !== "" || status !== undefined || destination !== "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cards"
        subtitle={
          searching
            ? `${cards.length} result${cards.length === 1 ? "" : "s"}`
            : "Advanced inventory and diagnostics. Everyday setup happens from each client's NFC section."
        }
        actions={
          <form action={createCardAction}>
            <Button type="submit">
              <Plus aria-hidden="true" className="h-4 w-4" />
              New Card
            </Button>
          </form>
        }
      />

      {params.error === "create-failed" ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          Could not create the card. Please try again.
        </p>
      ) : null}

      <form action="/dashboard/cards" method="get" role="search" className="flex flex-col gap-2">
        <div className="flex gap-2">
          <label htmlFor="card-search" className="sr-only">
            Search cards
          </label>
          <Input
            id="card-search"
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Search card number, short code, client…"
            defaultValue={q}
          />
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <span className="sr-only sm:hidden">Search</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="card-status" className="sr-only">
            Filter by status
          </label>
          <Select id="card-status" name="status" defaultValue={status ?? ""} className="w-auto">
            <option value="">All statuses</option>
            {CARD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <label htmlFor="card-destination" className="sr-only">
            Filter by destination
          </label>
          <Select
            id="card-destination"
            name="destination"
            defaultValue={destination}
            className="w-auto"
          >
            {DESTINATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {searching ? (
            <Link
              href="/dashboard/cards"
              className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-muted hover:text-text"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {cards.length === 0 && !searching ? (
        <EmptyState
          title="No card records yet"
          description="Cards are usually created automatically when you configure NFC for a client — you rarely need to create one by hand."
          action={
            <Link
              href="/dashboard/clients"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
            >
              View Clients
            </Link>
          }
        />
      ) : null}

      {cards.length === 0 && searching ? (
        <EmptyState
          title="No cards match your search"
          description="Try a different search or filter."
        />
      ) : null}

      {cards.length > 0 ? (
        <section
          aria-label="Cards"
          className="rounded-lg border border-border bg-surface px-4 shadow-[var(--shadow-card)]"
        >
          <CardRows cards={cards} />
        </section>
      ) : null}
    </div>
  );
}
