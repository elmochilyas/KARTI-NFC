import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Nfc, Pencil, Power, UserPlus } from "lucide-react";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getClientById } from "@/features/clients/service";
import { ProfileLinkPanel } from "@/features/profiles/components/ProfileLinkPanel";
import { ClientCardsSection } from "@/features/cards/components/ClientCardsSection";
import { NfcCardSection } from "@/features/cards/components/NfcCardSection";
import { getCardsByClientId } from "@/features/cards/service";
import { pickPrimaryCard } from "@/features/cards/orchestrate";
import { deriveClientSetupStatus, type ClientSetupStatus } from "@/features/dashboard/setupStatus";
import { getProfileByClientId } from "@/features/profiles/service";
import { activateProfile, deactivateProfile } from "./profile/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Client" };

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

/** Subtle setup progression: Client → Profile → NFC. Supports the existing flow, no wizard. */
function SetupProgress({ setup }: { setup: ClientSetupStatus }) {
  const steps = [
    { label: "Client", done: true },
    { label: "Profile", done: setup.stepsCompleted >= 2 },
    { label: "NFC", done: setup.stepsCompleted >= 3 },
  ];
  return (
    <p
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"
      aria-label={`Setup ${setup.stepsCompleted} of 3 complete: ${setup.label}`}
    >
      <span className="font-medium text-text">Setup · {setup.stepsCompleted} of 3</span>
      {steps.map((step) => (
        <span key={step.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${step.done ? "bg-success" : "bg-border"}`}
          />
          {step.label}
        </span>
      ))}
    </p>
  );
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <ErrorState
        title="Client management is not configured."
        description="Add Supabase keys to .env.local."
      />
    );
  }

  const supabase = await createClient();
  const result = await getClientById(id, supabase);

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") notFound();
    if (result.error.code === "UNAUTHORIZED") notFound();
    return <ErrorState title="Could not load the client." description={result.error.message} />;
  }

  const client = result.data;

  const profileResult = await getProfileByClientId(id, supabase);
  const profile = profileResult.ok ? profileResult.data : null;

  const cardsResult = await getCardsByClientId(id, supabase);
  const primaryCard = cardsResult.ok ? pickPrimaryCard(cardsResult.data) : null;
  const setup = deriveClientSetupStatus({
    profileStatus: profile?.status ?? null,
    primaryCardStatus: primaryCard?.status ?? null,
  });

  const primaryAction = !profile ? (
    <Link
      href={`/dashboard/clients/${client.id}/profile/new`}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
    >
      <UserPlus aria-hidden="true" className="h-4 w-4" />
      Create Profile
    </Link>
  ) : profile.status === "ACTIVE" ? (
    <Link
      href={`/dashboard/clients/${client.id}/nfc`}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
    >
      <Nfc aria-hidden="true" className="h-4 w-4" />
      Configure NFC Card
    </Link>
  ) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <BackLink href="/dashboard/clients">Back to Clients</BackLink>
        <div className="mt-2">
          <PageHeader
            title={client.name}
            subtitle={client.company ?? "Step 1 of 3 — client saved. Next: profile, then NFC."}
            actions={
              <>
                <Link
                  href={`/dashboard/clients/${client.id}/edit`}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-surface-muted px-4 font-medium text-text hover:bg-border"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Edit Client
                </Link>
                {primaryAction}
              </>
            }
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <SetupProgress setup={setup} />
            {profile ? <StatusBadge status={profile.status} /> : null}
          </div>
        </div>
      </div>

      <Section title="Contact" description="Customer relationship record.">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Phone</dt>
            <dd className="break-all text-right text-text">{client.phone ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Email</dt>
            <dd className="break-all text-right text-text">{client.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Added</dt>
            <dd className="break-all text-right text-text">{formatDateTime(client.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Updated</dt>
            <dd className="break-all text-right text-text">{formatDateTime(client.updated_at)}</dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Profile"
        description={
          !profile
            ? "Step 2 — no public page yet."
            : profile.status === "ACTIVE"
              ? "Step 2 done — public page is live."
              : "Step 2 — profile saved as draft."
        }
      >
        {!profile ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              No profile configured yet. Create one to get a public link, then configure the NFC
              card.
            </p>
            <div>
              <Link
                href={`/dashboard/clients/${client.id}/profile/new`}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Create Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">Display name</dt>
                <dd className="break-all text-right font-medium text-text">
                  {profile.display_name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">Type</dt>
                <dd className="text-right text-text">
                  {profile.profile_type === "BUSINESS" ? "Business" : "Individual"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">Slug</dt>
                <dd className="break-all text-right font-mono text-text">/{profile.slug}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0 text-muted">Status</dt>
                <dd>
                  <StatusBadge status={profile.status} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted">Updated</dt>
                <dd className="break-all text-right text-text">
                  {formatDateTime(profile.updated_at)}
                </dd>
              </div>
            </dl>
            <ProfileLinkPanel slug={profile.slug} status={profile.status} framed={false} />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href={`/dashboard/clients/${client.id}/profile`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border sm:w-auto"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Edit Profile
              </Link>
              <Link
                href={`/dashboard/clients/${client.id}/profile#preview`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:border-accent sm:w-auto"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
                Preview
              </Link>
              {profile.status !== "ACTIVE" ? (
                <form
                  action={activateProfile.bind(null, client.id, profile.id)}
                  className="w-full sm:w-auto"
                >
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full border-success/40 bg-success-muted text-success hover:bg-success-muted/70 sm:w-auto"
                  >
                    <Power aria-hidden="true" className="h-4 w-4" />
                    Activate
                  </Button>
                </form>
              ) : (
                <form
                  action={deactivateProfile.bind(null, client.id, profile.id)}
                  className="w-full sm:w-auto"
                >
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full border-warning/40 bg-warning-muted text-warning hover:bg-warning-muted/70 sm:w-auto"
                  >
                    <Power aria-hidden="true" className="h-4 w-4" />
                    Deactivate
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </Section>

      <NfcCardSection clientId={client.id} />
      <ClientCardsSection clientId={client.id} />

      {client.notes ? (
        <Section title="Notes" description="Admin-only. Never shown on public pages.">
          <p className="whitespace-pre-wrap text-sm text-text">{client.notes}</p>
        </Section>
      ) : null}
    </div>
  );
}
