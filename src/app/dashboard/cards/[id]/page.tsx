import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardById, permanentCardUrl } from "@/features/cards/service";
import {
  AssignCardForm,
  DestinationForm,
  StatusForm,
  UnassignCardButton,
} from "@/features/cards/components/CardForms";
import { PhysicalCardPanel } from "@/features/cards/components/PhysicalCardPanel";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { listClients } from "@/features/clients/service";
import { getProfileByClientId } from "@/features/profiles/service";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Card" };

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type CardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <ErrorState
        title="Card management is not configured."
        description="Add Supabase keys to .env.local."
      />
    );
  }

  const supabase = await createClient();
  const result = await getCardById(id, supabase);

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED") notFound();
    return <ErrorState title="Could not load the card." description={result.error.message} />;
  }

  const card = result.data;
  const permanentUrl = permanentCardUrl(card.short_code);

  const clientsResult = await listClients({ query: "" }, supabase);
  const clients = clientsResult.ok ? clientsResult.data : [];

  let profile: { id: string; slug: string; display_name: string; status: string } | null = null;
  if (card.client_id) {
    const profileResult = await getProfileByClientId(card.client_id, supabase);
    if (profileResult.ok && profileResult.data) {
      const p = profileResult.data;
      profile = { id: p.id, slug: p.slug, display_name: p.display_name, status: p.status };
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <BackLink href="/dashboard/cards">Back to Cards</BackLink>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <PageHeader
              title={card.card_number}
              subtitle={`Short code ${card.short_code} · Advanced inventory record. Everyday setup happens from the client's NFC section.`}
            />
          </div>
          <StatusBadge status={card.status} />
        </div>
      </div>

      <Section
        title="Physical card"
        description="Permanent URL, QR, and NFC writer — all three carry the same URL."
      >
        <PhysicalCardPanel
          permanentUrl={permanentUrl}
          cardNumber={card.card_number}
          shortCode={card.short_code}
          nfcLabel="Rewrite NFC Tag"
        />
      </Section>

      <Section title="Owner" description="Which client owns this physical card.">
        {card.clients ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <Link
                href={`/dashboard/clients/${card.clients.id}`}
                className="font-medium text-accent hover:underline"
              >
                {card.clients.name}
              </Link>
            </p>
            <div>
              <UnassignCardButton cardId={card.id} />
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-muted">Unassigned inventory.</p>
            <AssignCardForm
              cardId={card.id}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
            />
          </div>
        )}
      </Section>

      <Section
        title="Destination"
        description="What the permanent URL opens. Switching never changes the card itself."
      >
        <div className="text-sm text-muted">
          {card.destination_type === "PROFILE" && card.destination_profile ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-text">
              Karti Profile:{" "}
              <span className="font-medium">{card.destination_profile.display_name}</span>
              <span className="font-mono">/{card.destination_profile.slug}</span>
              <StatusBadge status={card.destination_profile.status} />
            </p>
          ) : null}
          {card.destination_type === "EXTERNAL_URL" && card.destination_url ? (
            <p className="mt-1 break-all text-text">{card.destination_url}</p>
          ) : null}
          {!card.destination_type ? <p className="mt-1">No destination configured.</p> : null}
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <DestinationForm
            cardId={card.id}
            clientId={card.client_id}
            profile={profile}
            current={{
              type: card.destination_type,
              profileId: card.destination_profile_id,
              url: card.destination_url,
            }}
          />
        </div>
      </Section>

      <Section title="Status & history" description="Lifecycle state plus timestamps.">
        <StatusForm cardId={card.id} current={card.status} />
        <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Created</dt>
            <dd className="break-all text-right text-text">{formatDateTime(card.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Updated</dt>
            <dd className="break-all text-right text-text">{formatDateTime(card.updated_at)}</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
