import Link from "next/link";
import { ExternalLink, Nfc, Plus } from "lucide-react";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getCardsByClientId, listUnassignedCards } from "@/features/cards/service";
import type { CardSummary } from "@/features/cards/types";
import { pickPrimaryCard } from "@/features/cards/orchestrate";
import { qrPayloadForCard } from "@/features/cards/qr";
import { CopyButton } from "./CopyButton";
import { PhysicalCardPanel } from "./PhysicalCardPanel";
import { AssignExistingCardForm } from "./CardForms";
import { createClient } from "@/lib/supabase/server";

function destinationLabel(card: CardSummary, profileName: string | null): string {
  if (card.destination_type === "PROFILE") {
    return profileName ? `Karti Profile (${profileName})` : "Karti Profile";
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

function sortCards(cards: CardSummary[], primaryId: string | null): CardSummary[] {
  return [...cards].sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

/**
 * Client-centric multi-card section: every card owned by this client with
 * its own permanent link, destination, and status. Primary card (dashboard
 * counts, ADR-030) is badged but never hides the others.
 *
 * Accepts pre-fetched `cards`/`inventory` (client page loads once and
 * prop-drills); falls back to fetching when used standalone.
 */
export async function NfcCardSection({
  clientId,
  cards,
  inventory,
  profileName = null,
}: {
  clientId: string;
  cards?: CardSummary[];
  inventory?: CardSummary[];
  profileName?: string | null;
}) {
  const supabase = await createClient();
  let listed: CardSummary[] = cards ?? [];
  if (cards === undefined) {
    const fetched = await getCardsByClientId(clientId, supabase);
    listed = fetched.ok ? fetched.data : [];
  }
  let stock: CardSummary[] = inventory ?? [];
  if (inventory === undefined) {
    const fetched = await listUnassignedCards(supabase);
    stock = fetched.ok ? fetched.data : [];
  }

  const primary = pickPrimaryCard(listed);
  const ordered = sortCards(listed, primary?.id ?? null);

  if (ordered.length === 0) {
    return (
      <Section
        title="NFC Cards"
        description="Each card has its own permanent link. Configure once, then tap a blank tag to program it."
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            No cards yet. Configure the first one, then add more any time — each keeps its own link.
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
          {stock.length > 0 ? (
            <div className="mt-2 border-t border-border pt-4">
              <p className="mb-2 text-sm text-muted">Or attach an existing unassigned card:</p>
              <AssignExistingCardForm
                clientId={clientId}
                cards={stock.map((c) => ({
                  id: c.id,
                  card_number: c.card_number,
                  short_code: c.short_code,
                }))}
              />
            </div>
          ) : null}
        </div>
      </Section>
    );
  }

  const primaryPermanentUrl = primary ? qrPayloadForCard(primary.short_code) : null;

  return (
    <Section
      title={`NFC Cards (${ordered.length})`}
      description="Each card has its own permanent link. Change destination any time without rewriting."
      actions={
        <Link
          href={`/dashboard/clients/${clientId}/nfc?new=1`}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add another card
        </Link>
      }
    >
      <ul className="flex flex-col gap-4">
        {ordered.map((card) => {
          const permanentUrl = qrPayloadForCard(card.short_code);
          const isPrimary = primary?.id === card.id;
          const retired = card.status === "LOST" || card.status === "REPLACED";
          return (
            <li key={card.id} className="rounded-lg border border-border bg-surface-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-text">
                    {card.card_number}
                  </span>
                  {isPrimary ? (
                    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-contrast">
                      Primary
                    </span>
                  ) : null}
                </p>
                <StatusBadge status={card.status} />
              </div>

              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted">Opens</dt>
                  <dd className="break-all text-right font-medium text-text">
                    {destinationLabel(card, profileName)}
                  </dd>
                </div>
                {card.destination_type === "EXTERNAL_URL" && card.destination_url ? (
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-muted">Link</dt>
                    <dd className="break-all text-right text-text">{card.destination_url}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted">Permanent URL</dt>
                  <dd className="break-all text-right font-mono text-xs text-text">
                    {permanentUrl}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={permanentUrl} label="Copy URL" />
                <a
                  href={permanentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-border"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  Test Link
                </a>
              </div>

              {isPrimary && primaryPermanentUrl ? (
                <details className="mt-3 rounded-md border border-border bg-surface px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-text">
                    QR & NFC for this card
                  </summary>
                  <div className="pt-3">
                    <PhysicalCardPanel
                      permanentUrl={primaryPermanentUrl}
                      cardNumber={card.card_number}
                      shortCode={card.short_code}
                      compact
                    />
                  </div>
                </details>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                {!retired ? (
                  <Link
                    href={`/dashboard/clients/${clientId}/nfc?card=${card.id}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-border"
                  >
                    Change destination
                  </Link>
                ) : (
                  <span className="inline-flex min-h-9 items-center text-sm text-muted">
                    Retired — add another card instead.
                  </span>
                )}
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted hover:text-text"
                >
                  Card details
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {stock.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm text-muted">Or attach an existing unassigned card:</p>
          <AssignExistingCardForm
            clientId={clientId}
            cards={stock.map((c) => ({
              id: c.id,
              card_number: c.card_number,
              short_code: c.short_code,
            }))}
          />
        </div>
      ) : null}
    </Section>
  );
}
