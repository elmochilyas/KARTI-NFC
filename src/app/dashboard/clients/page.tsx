import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { QuickAddForm } from "@/features/clients/components/QuickAddForm";
import { listClients } from "@/features/clients/service";
import type { ClientSummary } from "@/features/clients/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clients" };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function contactLine(client: ClientSummary): string {
  return (
    [client.company, client.phone, client.email].filter(Boolean).join(" · ") || "No details yet"
  );
}

function ClientRows({ clients }: { clients: ClientSummary[] }) {
  return (
    <>
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">Karti clients</caption>
        <thead>
          <tr className="border-b border-border text-left text-sm text-muted">
            <th scope="col" className="py-2 pr-4 font-medium">
              Client
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Contact
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Added
            </th>
            <th scope="col" className="py-2 font-medium">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-text">{client.name}</p>
                {client.company ? <p className="text-sm text-muted">{client.company}</p> : null}
              </td>
              <td className="py-3 pr-4 text-sm text-muted">
                {[client.phone, client.email].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="py-3 pr-4 text-sm text-muted">{formatDate(client.created_at)}</td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/clients/${client.id}`}
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
        {clients.map((client) => (
          <li key={client.id}>
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-text">{client.name}</span>
                <span className="block truncate text-sm text-muted">{contactLine(client)}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

type ClientsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Clients" subtitle="Find, add, and open Karti customers." />
        <ErrorState
          title="Client management is not configured."
          description="Add Supabase keys to .env.local to load clients."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const result = await listClients({ query: q }, supabase);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Clients"
          subtitle="Find, add, and open Karti customers."
          actions={
            <Link
              href="/dashboard/clients/new"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              New Client
            </Link>
          }
        />
        <ErrorState title="Could not load clients." description={result.error.message} />
      </div>
    );
  }

  const clients = result.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle={
          q !== ""
            ? `${clients.length} result${clients.length === 1 ? "" : "s"} for “${q}”`
            : clients.length > 0
              ? `${clients.length} client${clients.length === 1 ? "" : "s"}`
              : "Find, add, and open Karti customers."
        }
        actions={
          <Link
            href="/dashboard/clients/new"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            New Client
          </Link>
        }
      />

      <form action="/dashboard/clients" method="get" role="search" className="flex gap-2">
        <label htmlFor="client-search" className="sr-only">
          Search clients
        </label>
        <Input
          id="client-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Search name, company, phone, email…"
          defaultValue={q}
        />
        <Button type="submit" variant="secondary" size="md">
          <Search aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <span className="sr-only sm:hidden">Search</span>
        </Button>
        {q !== "" ? (
          <Link
            href="/dashboard/clients"
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-muted hover:text-text"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {clients.length === 0 && q === "" ? (
        <EmptyState
          title="No clients yet"
          description="Create your first Karti client, then add their profile and NFC card."
          action={
            <Link
              href="/dashboard/clients/new"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              New Client
            </Link>
          }
        />
      ) : null}

      {clients.length === 0 && q !== "" ? (
        <EmptyState
          title="No clients match your search"
          description={`Nothing found for “${q}”. Try a different search or create a new client.`}
          action={
            <Link
              href="/dashboard/clients/new"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border"
            >
              New Client
            </Link>
          }
        />
      ) : null}

      {clients.length > 0 ? (
        <section
          aria-label={q !== "" ? `Clients matching ${q}` : "Clients"}
          className="rounded-lg border border-border bg-surface px-4 shadow-[var(--shadow-card)]"
        >
          <ClientRows clients={clients} />
        </section>
      ) : null}

      <QuickAddForm />
    </div>
  );
}
