import Link from "next/link";
import { Section } from "@/components/dashboard/Section";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getCardsByClientId, listUnassignedCards } from "@/features/cards/service";
import { AssignExistingCardForm } from "./CardForms";
import { createClient } from "@/lib/supabase/server";

/** Assigned-cards summary + attach-inventory picker for the client detail page. */
export async function ClientCardsSection({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const [assigned, unassigned] = await Promise.all([
    getCardsByClientId(clientId, supabase),
    listUnassignedCards(supabase),
  ]);

  const cards = assigned.ok ? assigned.data : [];
  const inventory = unassigned.ok ? unassigned.data : [];

  return (
    <Section
      title="All cards (advanced)"
      description="Every card owned by this client. Normal setup uses the NFC Card section above."
    >
      {cards.length === 0 ? (
        <p className="text-sm text-muted">No cards assigned yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/dashboard/cards/${card.id}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {card.card_number}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {card.destination_type === "PROFILE"
                      ? "Profile"
                      : card.destination_type === "EXTERNAL_URL"
                        ? "External link"
                        : "No destination"}
                  </span>
                </span>
                <StatusBadge status={card.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {inventory.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <AssignExistingCardForm
            clientId={clientId}
            cards={inventory.map((c) => ({
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
