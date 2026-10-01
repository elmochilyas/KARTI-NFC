import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { getClientById } from "@/features/clients/service";
import { getCardsByClientId } from "@/features/cards/service";
import { listProfileLinks } from "@/features/profiles/links";
import { getProfileByClientId } from "@/features/profiles/service";
import { LINK_TYPE_LABELS } from "@/features/profiles/types";
import {
  NfcConfigureForm,
  type DestinationSuggestion,
} from "@/features/cards/components/NfcConfigureForm";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Configure NFC Card" };

const SUGGESTABLE_LINK_TYPES = [
  "google_review",
  "instagram",
  "booking",
  "maps",
  "website",
] as const;

type NfcPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ card?: string; new?: string }>;
};

export default async function NfcConfigurePage({ params, searchParams }: NfcPageProps) {
  const { id: clientId } = await params;
  const query = searchParams ? await searchParams : {};
  const forceNew = query.new === "1";
  const targetCardId = typeof query.card === "string" && query.card.length > 0 ? query.card : null;

  if (!isSupabaseConfigured()) {
    return (
      <ErrorState
        title="NFC configuration is not configured."
        description="Add Supabase keys to .env.local."
      />
    );
  }

  const supabase = await createClient();
  const clientResult = await getClientById(clientId, supabase);
  if (!clientResult.ok) notFound();

  const profileResult = await getProfileByClientId(clientId, supabase);
  if (!profileResult.ok) {
    return <ErrorState title="Could not load data." description={profileResult.error.message} />;
  }
  const profile = profileResult.data;

  let suggestions: DestinationSuggestion[] = [];
  if (profile) {
    const linksResult = await listProfileLinks(profile.id, clientId, supabase);
    const links = linksResult.ok ? linksResult.data : [];
    suggestions = links
      .filter(
        (l): l is typeof l & { type: (typeof SUGGESTABLE_LINK_TYPES)[number] } =>
          l.enabled && (SUGGESTABLE_LINK_TYPES as readonly string[]).includes(l.type),
      )
      .map((l) => ({
        preset: l.type,
        label: LINK_TYPE_LABELS[l.type as keyof typeof LINK_TYPE_LABELS] ?? l.label,
        url: l.url,
      }));
  }

  // Multi-card context: explicit card must belong to this client.
  let targetCardNumber: string | null = null;
  if (targetCardId && !forceNew) {
    const cardsResult = await getCardsByClientId(clientId, supabase);
    const target = cardsResult.ok
      ? cardsResult.data.find((c) => c.id === targetCardId)
      : undefined;
    if (!target) notFound();
    targetCardNumber = target.card_number;
  }

  const title = forceNew
    ? "Add another card"
    : targetCardNumber
      ? `Change destination — ${targetCardNumber}`
      : "Configure NFC Card";
  const subtitle = forceNew
    ? "Creates an additional card for this client. Existing cards keep working untouched."
    : targetCardNumber
      ? "Updates this card only. Same card, same permanent URL — other cards untouched."
      : "Step 1 — destination, Step 2 — confirm, Step 3 — tap a blank tag. The card record is prepared automatically.";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <BackLink href={`/dashboard/clients/${clientId}`}>
          Back to {clientResult.data.name}
        </BackLink>
        <div className="mt-2">
          <PageHeader title={title} subtitle={subtitle} />
        </div>
      </div>
      <NfcConfigureForm
        clientId={clientId}
        clientName={clientResult.data.name}
        profileAvailable={profile !== null}
        profileActive={profile?.status === "ACTIVE"}
        website={profile?.website ?? null}
        suggestions={suggestions}
        targetCardId={targetCardId}
        forceNew={forceNew}
        targetCardNumber={targetCardNumber}
      />
    </div>
  );
}
