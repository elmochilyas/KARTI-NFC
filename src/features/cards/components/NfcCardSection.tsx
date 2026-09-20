import Link from "next/link";
import { Nfc } from "lucide-react";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getCardById, getCardsByClientId } from "@/features/cards/service";
import type { CardSummary } from "@/features/cards/types";
import { pickPrimaryCard } from "@/features/cards/orchestrate";
import { qrPayloadForCard } from "@/features/cards/qr";
import { PhysicalCardPanel } from "./PhysicalCardPanel";
import { createClient } from "@/lib/supabase/server";

function destinationLabel(card: {
  destination_type: string | null;
  destination_profile: { display_name: string } | null;
  destination_url: string | null;
}): string {
  if (card.destination_type === "PROFILE") {
    return card.destination_profile
      ? `Karti Profile (${card.destination_profile.display_name})`
      : "Karti Profile";
  }
  if (card.destination_type === "EXTERNAL_URL" && card.destination_url) {
    try {
      return new URL(card.destination_url).hostname;
    } catch {
      return "External link";
    }
  }
  return "Not set";
}

/**
 * Client-centric NFC status: one primary card, human states, no inventory jargon.
 * Accepts pre-fetched `cards` (client page loads once and prop-drills);
 * falls back to fetching when used standalone.
 */
export async function NfcCardSection({
  clientId,
  cards,
}: {
  clientId: string;
  cards?: CardSummary[];
}) {
  const supabase = await createClient();
  let listed: CardSummary[] = cards ?? [];
  if (cards === undefined) {
    const fetched = await getCardsByClientId(clientId, supabase);
    listed = fetched.ok ? fetched.data : [];
  }
  const primary = pickPrimaryCard(listed);

  const detail =
    primary && primary.status !== "UNASSIGNED"
      ? await getCardById(primary.id, supabase)
      : { ok: false as const, error: { code: "NOT_FOUND" as const, message: "" } };
  const card = detail.ok ? detail.data : null;

  if (!card) {
    return (
      <Section
        title="NFC Card"
        description="Step 3 — the tap destination. One card per client in the normal flow."
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Not configured yet. Configure once, then tap a blank tag to program it.
          </p>
          <div>
            <Link
              href={`/dashboard/clients/${clientId}/nfc`}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
            >
              <Nfc aria-hidden="true" className="h-4 w-4" />
              Configure NFC Card
            </Link>
          </div>
        </div>
      </Section>
    );
  }

  const permanentUrl = qrPayloadForCard(card.short_code);

  return (
    <Section
      title="NFC Card"
      description="Step 3 done — this is what the physical card opens."
      actions={<StatusBadge status={card.status} />}
    >
      <div className="flex flex-col gap-4">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Destination</dt>
            <dd className="break-all text-right font-medium text-text">{destinationLabel(card)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Card</dt>
            <dd className="break-all text-right font-mono text-text">{card.card_number}</dd>
          </div>
        </dl>
        <PhysicalCardPanel
          permanentUrl={permanentUrl}
          cardNumber={card.card_number}
          shortCode={card.short_code}
        />
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link
            href={`/dashboard/clients/${clientId}/nfc`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border"
          >
            Change Destination
          </Link>
          <Link
            href={`/dashboard/cards/${card.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted hover:text-text"
          >
            Card details
          </Link>
        </div>
      </div>
    </Section>
  );
}
