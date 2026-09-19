import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listClients } from "@/features/clients/service";
import { listCards } from "@/features/cards/service";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
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
        <ErrorState
          title="Dashboard is not configured."
          description="Add Supabase keys to .env.local to load operations."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [clientsResult, cardsResult, profilesCount] = await Promise.all([
    listClients({ query: "" }, supabase),
    listCards({}, supabase),
    supabase.from("profiles").select("id,status", { count: "exact" }),
  ]);

  if (!clientsResult.ok || !cardsResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
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
        <ErrorState
          title="Could not load dashboard."
          description={!clientsResult.ok ? clientsResult.error.message : "Please try again."}
        />
      </div>
    );
  }

  const clients = clientsResult.data;
  const cards = cardsResult.data;
  const activeCards = cards.filter((c) => c.status === "ACTIVE").length;
  const unassignedCards = cards.filter((c) => c.status === "UNASSIGNED").length;
  const activeProfiles = (profilesCount.data ?? []).filter((p) => p.status === "ACTIVE").length;
  const recentClients = clients.slice(0, 5);

  if (clients.length === 0 && cards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
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
        <EmptyState
          title="No activity yet"
          description="Create your first Karti client, then add their profile and configure their NFC card."
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Client and card operations at a glance."
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/clients"
          className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent"
        >
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Users aria-hidden="true" className="h-4 w-4" />
            Clients
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-text">{clients.length}</p>
          <p className="mt-0.5 text-sm text-muted">View all</p>
        </Link>
        <Link
          href="/dashboard/cards?status=ACTIVE"
          className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent"
        >
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <CreditCard aria-hidden="true" className="h-4 w-4" />
            Active cards
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-text">{activeCards}</p>
          <p className="mt-0.5 text-sm text-muted">
            {unassignedCards > 0 ? `${unassignedCards} unassigned` : `${cards.length} total`}
          </p>
        </Link>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-muted">Active profiles</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-text">{activeProfiles}</p>
          <p className="mt-0.5 text-sm text-muted">Public and tappable</p>
        </div>
      </div>

      <Section
        title="Recent clients"
        description="Pick up where you left off."
        actions={
          <Link
            href="/dashboard/clients"
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-accent hover:underline"
          >
            View all
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        }
      >
        {recentClients.length === 0 ? (
          <p className="text-sm text-muted">No clients yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentClients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text">{client.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {[client.company, client.phone, client.email].filter(Boolean).join(" · ") ||
                        `Added ${formatDate(client.created_at)}`}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {unassignedCards > 0 ? (
        <Section
          title="Cards needing attention"
          description={`${unassignedCards} card${unassignedCards === 1 ? "" : "s"} in inventory without an owner.`}
          actions={
            <Link
              href="/dashboard/cards"
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-accent hover:underline"
            >
              Open inventory
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="flex flex-col gap-2">
            {cards
              .filter((c) => c.status === "UNASSIGNED")
              .slice(0, 3)
              .map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/dashboard/cards/${card.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 hover:border-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text">
                        {card.card_number}
                      </span>
                      <span className="block truncate font-mono text-sm text-muted">
                        {card.short_code}
                      </span>
                    </span>
                    <StatusBadge status={card.status} />
                  </Link>
                </li>
              ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
