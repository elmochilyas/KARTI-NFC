import { validateSafeExternalUrl } from "@/domain/urls";
import type { CardDb } from "./service";
import {
  assignCardToClient,
  createCard,
  getCardsByClientId,
  requireAdmin,
  setCardDestinationToExternalUrl,
  setCardDestinationToProfile,
  setCardStatus,
  permanentCardUrl,
} from "./service";
import { getProfileByClientId } from "@/features/profiles/service";
import type { CardRow, CardSummary } from "./types";

/**
 * Client-centric NFC orchestration (ADR-023).
 *
 * The operator never manually creates/assigns/activates cards in the normal
 * flow — this function composes the existing card primitives so that
 * "Configure NFC Card" is one action: create (if needed) → assign →
 * destination → ACTIVE. Short codes and card numbers never change on
 * reconfigure; the same physical card keeps working.
 */

export type ConfigureInput = { kind: "PROFILE" } | { kind: "EXTERNAL_URL"; url: string };

export type ConfigureErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NO_PROFILE"
  | "PROFILE_NOT_ACTIVE"
  | "INVALID_URL"
  | "UNKNOWN";

export type ConfigureResult =
  | { ok: true; data: { card: CardRow; permanentUrl: string; reused: boolean } }
  | { ok: false; error: { code: ConfigureErrorCode; message: string } };

function fail(code: ConfigureErrorCode, message: string): ConfigureResult {
  return { ok: false, error: { code, message } };
}

/**
 * Primary-card rule: ACTIVE first (newest created), else newest usable
 * (excluding LOST/REPLACED), else newest overall. Pure — unit-tested.
 * Generic over the row shape so dashboard summaries can reuse the exact
 * same rule with lightweight projections.
 */
export function pickPrimaryCard<T extends Pick<CardSummary, "status" | "created_at">>(
  cards: T[],
): T | null {
  if (cards.length === 0) return null;
  const byNewest = (a: T, b: T) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  const active = cards.filter((c) => c.status === "ACTIVE").sort(byNewest);
  if (active[0]) return active[0];
  const usable = cards.filter((c) => c.status !== "LOST" && c.status !== "REPLACED").sort(byNewest);
  if (usable[0]) return usable[0];
  return [...cards].sort(byNewest)[0] ?? null;
}

export async function configureCardForClient(
  clientId: string,
  input: ConfigureInput,
  supabase: CardDb,
): Promise<ConfigureResult> {
  if (!(await requireAdmin(supabase))) {
    return fail("UNAUTHORIZED", "Sign in to configure NFC cards.");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return fail("NOT_FOUND", "Client not found.");

  const profileResult = await getProfileByClientId(clientId, supabase);
  if (!profileResult.ok) {
    return fail("UNKNOWN", "Could not load the client profile. Please try again.");
  }
  const profile = profileResult.data;

  let destinationUrl: string | null = null;
  if (input.kind === "PROFILE") {
    if (!profile) {
      return fail("NO_PROFILE", "This client does not have a Karti profile yet.");
    }
    if (profile.status !== "ACTIVE") {
      return fail(
        "PROFILE_NOT_ACTIVE",
        "Activate the Karti profile before configuring the card to open it.",
      );
    }
  } else {
    const normalized = validateSafeExternalUrl(input.url);
    if (!normalized) {
      return fail("INVALID_URL", "Enter a valid http(s) URL.");
    }
    destinationUrl = normalized;
  }

  const cardsResult = await getCardsByClientId(clientId, supabase);
  if (!cardsResult.ok) {
    return fail("UNKNOWN", "Could not load the client cards. Please try again.");
  }
  const primary = pickPrimaryCard(cardsResult.data);

  let cardId: string;
  let reused = false;
  if (!primary) {
    const created = await createCard(supabase);
    if (!created.ok) {
      return fail("UNKNOWN", "Could not create the card. Please try again.");
    }
    const assigned = await assignCardToClient(created.data.id, clientId, supabase);
    if (!assigned.ok) {
      return fail("UNKNOWN", "Could not assign the card. Please try again.");
    }
    cardId = assigned.data.id;
  } else {
    reused = true;
    cardId = primary.id;
    if (primary.status === "UNASSIGNED") {
      const assigned = await assignCardToClient(primary.id, clientId, supabase);
      if (!assigned.ok) {
        return fail("UNKNOWN", "Could not assign the card. Please try again.");
      }
    }
  }

  // Destination (atomic field swap inside each setter; CHECK-guarded).
  if (input.kind === "PROFILE" && profile) {
    const dest = await setCardDestinationToProfile(cardId, clientId, profile.id, supabase);
    if (!dest.ok) return fail("UNKNOWN", dest.error.message);
  } else if (destinationUrl) {
    const dest = await setCardDestinationToExternalUrl(cardId, destinationUrl, supabase);
    if (!dest.ok) return fail("UNKNOWN", dest.error.message);
  }

  const activated = await setCardStatus(cardId, "ACTIVE", supabase);
  if (!activated.ok) {
    return fail("UNKNOWN", activated.error.message);
  }

  return {
    ok: true,
    data: {
      card: activated.data,
      permanentUrl: permanentCardUrl(activated.data.short_code),
      reused,
    },
  };
}
