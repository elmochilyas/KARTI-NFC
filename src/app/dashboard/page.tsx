import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, UserPlus, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getDashboardOverview, type OverviewClient } from "@/features/dashboard/overview";
import { nfcBadgeStatus, type AttentionItem } from "@/features/dashboard/setupStatus";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const NEW_CLIENT_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong";

function HeaderActions() {
  return (
    <Link href="/dashboard/clients/new" className={NEW_CLIENT_BUTTON}>
      <UserPlus aria-hidden="true" className="h-4 w-4" />
      New Client
    </Link>
  );
}

function QuickActions() {
  const secondary =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:border-accent";
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Link href="/dashboard/clients/new" className={NEW_CLIENT_BUTTON}>
        <UserPlus aria-hidden="true" className="h-4 w-4" />
        New Client
      </Link>
      <Link href="/dashboard/clients#quick-add" className={secondary}>
        <Zap aria-hidden="true" className="h-4 w-4" />
        Quick Add Client
      </Link>
      <Link href="/dashboard/clients" className={secondary}>
        <Users aria-hidden="true" className="h-4 w-4" />
        View Clients
      </Link>
      <Link href="/dashboard/cards" className={secondary}>
        <CreditCard aria-hidden="true" className="h-4 w-4" />
        View Cards
      </Link>
    </nav>
  );
}

function SummaryTile({
  href,
  label,
  value,
  sub,
  icon,
}: {
  href?: string;
  label: string;
  value: number;
  sub: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-text">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{sub}</p>
    </>
  );
  const className =
    "rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors";
  return href ? (
    <Link href={href} className={`${className} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <span className="min-w-0">
        <Link
          href={`/dashboard/clients/${item.clientId}`}
          className="block truncate font-medium text-text hover:underline"
        >
          {item.clientName}
        </Link>
        <span className="block truncate text-sm text-muted">
          {[item.company, item.reason].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Link
        href={item.href}
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-surface-muted px-3 text-sm font-medium text-text hover:bg-border"
      >
        {item.actionLabel}
      </Link>
    </li>
  );
}

function RecentRow({ client }: { client: OverviewClient }) {
  return (
    <li>
      <Link
        href={`/dashboard/clients/${client.id}`}
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-text">{client.name}</span>
          <span className="block truncate text-sm text-muted">
            {client.company ?? "No company yet"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {client.profileStatus ? (
            <StatusBadge status={client.profileStatus} />
          ) : (
            <span className="text-sm text-muted">No profile</span>
          )}
          <StatusBadge status={nfcBadgeStatus(client.setup, client.primaryCard?.status ?? null)} />
        </span>
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
          actions={<HeaderActions />}
        />
        <ErrorState
          title="Dashboard is not configured."
          description="Add Supabase keys to .env.local to load operations."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const result = await getDashboardOverview(supabase);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
          actions={<HeaderActions />}
        />
        <ErrorState
          title="We couldn't load your dashboard."
          description={result.error.message}
          action={
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border"
            >
              Try again
            </Link>
          }
        />
      </div>
    );
  }

  const { counts, recentClients, attention, attentionTotal } = result.data;

  if (counts.clients === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Client and card operations at a glance."
          actions={<HeaderActions />}
        />
        <EmptyState
          title="No clients yet"
          description="Create your first client to start building a Karti profile."
          action={
            <Link href="/dashboard/clients/new" className={NEW_CLIENT_BUTTON}>
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              Create Client
            </Link>
          }
        />
      </div>
    );
  }

  const actionItems = attention.filter((a) => a.severity === "attention");
  const opportunityItems = attention.filter((a) => a.severity === "opportunity");
  const hiddenCount = attentionTotal - attention.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Client and card operations at a glance."
        actions={<HeaderActions />}
      />

      <QuickActions />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          href="/dashboard/clients"
          label="Clients"
          value={counts.clients}
          sub="View all"
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <SummaryTile
          label="Active Profiles"
          value={counts.activeProfiles}
          sub="Public and tappable"
        />
        <SummaryTile
          href="/dashboard/cards?status=ACTIVE"
          label="Configured Cards"
          value={counts.configuredCards}
          sub={
            counts.directLinkCards > 0
              ? `${counts.directLinkCards} open direct link${counts.directLinkCards === 1 ? "" : "s"}`
              : "Active primary cards"
          }
          icon={<CreditCard aria-hidden="true" className="h-4 w-4" />}
        />
        <SummaryTile
          href="#needs-attention"
          label="Needs Attention"
          value={counts.needsAttention}
          sub={counts.needsAttention === 0 ? "All clear" : "View list"}
        />
      </div>

      <Section
        title="Needs Attention"
        description={
          attentionTotal === 0
            ? "Every client is Ready."
            : `${attentionTotal} client${attentionTotal === 1 ? "" : "s"} need${attentionTotal === 1 ? "s" : ""} setup work.`
        }
      >
        <div id="needs-attention" className="scroll-mt-6">
          {attentionTotal === 0 ? (
            <p className="text-sm text-muted">
              Nothing to do — every client has an active profile and a configured card.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {actionItems.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {actionItems.map((item) => (
                    <AttentionRow key={item.clientId} item={item} />
                  ))}
                </ul>
              ) : null}
              {opportunityItems.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-text">Optional setup</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    These clients already work on their public profile link — NFC is optional.
                  </p>
                  <ul className="mt-1 flex flex-col divide-y divide-border">
                    {opportunityItems.map((item) => (
                      <AttentionRow key={item.clientId} item={item} />
                    ))}
                  </ul>
                </div>
              ) : null}
              {hiddenCount > 0 ? (
                <p className="text-sm text-muted">
                  +{hiddenCount} more{" "}
                  <Link
                    href="/dashboard/clients"
                    className="font-medium text-accent hover:underline"
                  >
                    — view all clients
                  </Link>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Recent Clients"
        description="Recently added clients and their setup state."
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
              <RecentRow key={client.id} client={client} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
