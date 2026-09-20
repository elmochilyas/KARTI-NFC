import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCardShortCode } from "@/domain/cards";
import { validateSafeExternalUrl } from "@/domain/urls";
import { getAppUrl } from "@/lib/env";
import type { Database } from "@/types/database";
import {
  CARD_DETAIL_COLUMNS,
  CARD_LIST_COLUMNS,
  type AssignedClient,
  type CardDetail,
  type CardResult,
  type CardRow,
  type CardSummary,
  type DestinationProfile,
} from "./types";
import { cardStatusSchema, clientIdSchema, externalUrlSchema, profileIdSchema } from "./schema";

export type CardDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_LIST_ROWS = 100;
const MAX_CREATE_ATTEMPTS = 10;

/** Permanent public URL for a physical card / QR payload. */
export function permanentCardUrl(shortCode: string): string {
  return `${getAppUrl()}/t/${shortCode}`;
}

/** Escape PostgREST LIKE wildcards so search matches literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function requireAdmin(supabase: CardDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED: CardResult<never> = {
  ok: false,
  error: { code: "UNAUTHORIZED", message: "Sign in to manage cards." },
};

function notFound(entity: string): CardResult<never> {
  return { ok: false, error: { code: "NOT_FOUND", message: `${entity} not found.` } };
}

function failed(message: string): CardResult<never> {
  return { ok: false, error: { code: "UNKNOWN", message } };
}

function invalid(message: string): CardResult<never> {
  return { ok: false, error: { code: "VALIDATION_ERROR", message } };
}

function toSummary(row: CardRow & { clients: AssignedClient }): CardSummary {
  return {
    id: row.id,
    card_number: row.card_number,
    short_code: row.short_code,
    status: row.status,
    destination_type: row.destination_type,
    created_at: row.created_at,
    clients: row.clients,
  };
}

/**
 * Create one physical card record: DB-sequence card_number, random short
 * code with collision retry, status UNASSIGNED, no client or destination.
 */
export async function createCard(supabase: CardDb): Promise<CardResult<CardRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const shortCode = generateCardShortCode();
    const { data, error } = await supabase
      .from("cards")
      .insert({ short_code: shortCode })
      .select(CARD_DETAIL_COLUMNS)
      .single();

    if (!error && data) return { ok: true, data };
    if (error?.code === "23505") {
      lastError = error.message;
      continue;
    }
    return failed("Could not create the card. Please try again.");
  }
  return failed(
    `Could not create the card after ${MAX_CREATE_ATTEMPTS} attempts. ${lastError ?? ""}`.trim(),
  );
}

async function fetchCardRow(id: string, supabase: CardDb) {
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) return { row: null as CardRow | null, error: true as const };
  return { row: data, error: false as const };
}

export async function getCardById(id: string, supabase: CardDb): Promise<CardResult<CardDetail>> {
  if (!UUID_PATTERN.test(id)) return notFound("Card");
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(id, supabase);
  if (error) return failed("Could not load the card. Please try again.");
  if (!row) return notFound("Card");

  let clients: AssignedClient = null;
  if (row.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", row.client_id)
      .maybeSingle();
    clients = client ?? null;
  }

  let destination_profile: DestinationProfile = null;
  if (row.destination_profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, slug, display_name, status")
      .eq("id", row.destination_profile_id)
      .maybeSingle();
    destination_profile = profile ?? null;
  }

  return { ok: true, data: { ...row, clients, destination_profile } };
}

export type ListCardsOptions = {
  query?: string;
  status?: string;
  destination?: "PROFILE" | "EXTERNAL_URL" | "NONE" | "";
};

export async function listCards(
  options: ListCardsOptions,
  supabase: CardDb,
): Promise<CardResult<CardSummary[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const q = options.query?.trim() ?? "";
  const byId = new Map<string, CardSummary>();

  function baseQuery() {
    let query = supabase
      .from("cards")
      .select(CARD_LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(MAX_LIST_ROWS);
    if (options.status) query = query.eq("status", options.status);
    if (options.destination === "PROFILE" || options.destination === "EXTERNAL_URL") {
      query = query.eq("destination_type", options.destination);
    } else if (options.destination === "NONE") {
      query = query.is("destination_type", null);
    }
    return query;
  }

  type CardQuery = ReturnType<typeof baseQuery>;

  async function collect(query: CardQuery) {
    const { data, error } = await query;
    if (error) return false;
    for (const row of data ?? []) {
      byId.set(row.id, toSummary(row as CardRow & { clients: AssignedClient }));
    }
    return true;
  }

  if (q === "") {
    if (!(await collect(baseQuery()))) {
      return failed("Could not load cards. Please try again.");
    }
  } else {
    const pattern = `%${escapeLikePattern(q)}%`;
    const filtered = baseQuery().or(
      `card_number.ilike.${pattern},short_code.ilike.${pattern}`,
    ) as CardQuery;
    if (!(await collect(filtered))) {
      return failed("Could not load cards. Please try again.");
    }
    // Assigned-client name search: resolve matching clients, then their cards.
    const { data: matchedClients } = await supabase
      .from("clients")
      .select("id")
      .or(`name.ilike.${pattern},company.ilike.${pattern}`)
      .limit(50);
    const ids = (matchedClients ?? []).map((c) => c.id);
    if (ids.length > 0) {
      if (!(await collect(baseQuery().in("client_id", ids) as CardQuery))) {
        return failed("Could not load cards. Please try again.");
      }
    }
  }

  const rows = [...byId.values()].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
  return { ok: true, data: rows };
}

export async function listUnassignedCards(supabase: CardDb): Promise<CardResult<CardSummary[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_LIST_COLUMNS)
    .is("client_id", null)
    .order("card_number", { ascending: true })
    .limit(MAX_LIST_ROWS);
  if (error) return failed("Could not load unassigned cards. Please try again.");
  return {
    ok: true,
    data: (data ?? []).map((row) => toSummary(row as CardRow & { clients: AssignedClient })),
  };
}

export async function getCardsByClientId(
  clientId: string,
  supabase: CardDb,
): Promise<CardResult<CardSummary[]>> {
  if (!UUID_PATTERN.test(clientId)) return notFound("Client");
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_LIST_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(MAX_LIST_ROWS);
  if (error) return failed("Could not load cards. Please try again.");
  return {
    ok: true,
    data: (data ?? []).map((row) => toSummary(row as CardRow & { clients: AssignedClient })),
  };
}

async function verifyClientExists(clientId: string, supabase: CardDb): Promise<boolean> {
  const { data } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
  return !!data;
}

/**
 * Assign a card to a client. Destination is always cleared for coherence
 * (a new owner must choose their own destination). UNASSIGNED becomes
 * ASSIGNED; ACTIVE/LOST/REPLACED cards must change status first.
 */
export async function assignCardToClient(
  cardId: string,
  rawClientId: unknown,
  supabase: CardDb,
): Promise<CardResult<CardRow>> {
  if (!UUID_PATTERN.test(cardId)) return notFound("Card");
  const parsedClient = clientIdSchema.safeParse(rawClientId);
  if (!parsedClient.success) return invalid("Choose a valid client.");
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(cardId, supabase);
  if (error) return failed("Could not assign the card. Please try again.");
  if (!row) return notFound("Card");
  if (row.status === "ACTIVE" || row.status === "LOST" || row.status === "REPLACED") {
    return invalid(`Change the card status before reassigning (currently ${row.status}).`);
  }
  if (!(await verifyClientExists(parsedClient.data, supabase))) return notFound("Client");

  const { data, error: updateError } = await supabase
    .from("cards")
    .update({
      client_id: parsedClient.data,
      destination_type: null,
      destination_profile_id: null,
      destination_url: null,
      status: row.status === "UNASSIGNED" ? "ASSIGNED" : row.status,
    })
    .eq("id", cardId)
    .select(CARD_DETAIL_COLUMNS)
    .maybeSingle();

  if (updateError || !data) {
    if (!data && !updateError) return notFound("Card");
    return failed("Could not assign the card. Please try again.");
  }
  return { ok: true, data };
}

/**
 * Unassign a card: clears owner and destination, returns to UNASSIGNED.
 * ACTIVE cards must be deactivated first; LOST/REPLACED stay put.
 */
export async function unassignCard(cardId: string, supabase: CardDb): Promise<CardResult<CardRow>> {
  if (!UUID_PATTERN.test(cardId)) return notFound("Card");
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(cardId, supabase);
  if (error) return failed("Could not unassign the card. Please try again.");
  if (!row) return notFound("Card");
  if (row.status === "ACTIVE") {
    return invalid("Deactivate the card before unassigning it.");
  }
  if (row.status === "LOST" || row.status === "REPLACED") {
    return invalid(`A ${row.status} card cannot be unassigned.`);
  }
  if (!row.client_id) return { ok: true, data: row };

  const { data, error: updateError } = await supabase
    .from("cards")
    .update({
      client_id: null,
      destination_type: null,
      destination_profile_id: null,
      destination_url: null,
      status: "UNASSIGNED",
    })
    .eq("id", cardId)
    .select(CARD_DETAIL_COLUMNS)
    .maybeSingle();

  if (updateError || !data) {
    if (!data && !updateError) return notFound("Card");
    return failed("Could not unassign the card. Please try again.");
  }
  return { ok: true, data };
}

/**
 * Point a card at an assigned client's profile. The card must already
 * belong to that client (explicit assign-first workflow).
 */
export async function setCardDestinationToProfile(
  cardId: string,
  clientId: string,
  rawProfileId: unknown,
  supabase: CardDb,
): Promise<CardResult<CardRow>> {
  if (!UUID_PATTERN.test(cardId) || !UUID_PATTERN.test(clientId)) return notFound("Card");
  const parsedProfile = profileIdSchema.safeParse(rawProfileId);
  if (!parsedProfile.success) return invalid("Choose a valid profile.");
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(cardId, supabase);
  if (error) return failed("Could not update the destination. Please try again.");
  if (!row) return notFound("Card");
  if (row.client_id !== clientId) {
    return invalid("Assign the card to the client before choosing their profile.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_id")
    .eq("id", parsedProfile.data)
    .maybeSingle();
  if (!profile) return notFound("Profile");
  if (profile.client_id !== clientId) {
    return invalid("That profile belongs to a different client.");
  }

  const { data, error: updateError } = await supabase
    .from("cards")
    .update({
      destination_type: "PROFILE",
      destination_profile_id: parsedProfile.data,
      destination_url: null,
    })
    .eq("id", cardId)
    .select(CARD_DETAIL_COLUMNS)
    .maybeSingle();

  if (updateError || !data) {
    if (!data && !updateError) return notFound("Card");
    return failed("Could not update the destination. Please try again.");
  }
  return { ok: true, data };
}

/** Point a card at a validated external URL (profile field cleared atomically). */
export async function setCardDestinationToExternalUrl(
  cardId: string,
  rawUrl: unknown,
  supabase: CardDb,
): Promise<CardResult<CardRow>> {
  if (!UUID_PATTERN.test(cardId)) return notFound("Card");
  const parsedUrl = externalUrlSchema.safeParse(rawUrl);
  if (!parsedUrl.success) {
    return invalid(parsedUrl.error.issues[0]?.message ?? "Enter a valid http(s) URL.");
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(cardId, supabase);
  if (error) return failed("Could not update the destination. Please try again.");
  if (!row) return notFound("Card");

  // Re-normalize at write time; validateSafeExternalUrl already did.
  const normalized = validateSafeExternalUrl(parsedUrl.data) ?? parsedUrl.data;
  const { data, error: updateError } = await supabase
    .from("cards")
    .update({
      destination_type: "EXTERNAL_URL",
      destination_profile_id: null,
      destination_url: normalized,
    })
    .eq("id", cardId)
    .select(CARD_DETAIL_COLUMNS)
    .maybeSingle();

  if (updateError || !data) {
    if (!data && !updateError) return notFound("Card");
    return failed("Could not update the destination. Please try again.");
  }
  return { ok: true, data };
}

export type ActivationCheck = { ok: true } | { ok: false; message: string };

/**
 * Pure activation gate: a card may become ACTIVE only with an owner, a
 * configured destination, and a resolvable target. Unit-tested without a DB.
 */
export function checkActivationReadiness(
  card: Pick<
    CardRow,
    "client_id" | "destination_type" | "destination_profile_id" | "destination_url"
  >,
  profile: { client_id: string; status: string } | null,
): ActivationCheck {
  if (!card.client_id) {
    return { ok: false, message: "Assign the card to a client before activating it." };
  }
  if (card.destination_type === "PROFILE") {
    if (!card.destination_profile_id) {
      return { ok: false, message: "Choose a profile destination before activating." };
    }
    if (!profile) {
      return { ok: false, message: "The destination profile no longer exists." };
    }
    if (profile.client_id !== card.client_id) {
      return { ok: false, message: "The destination profile belongs to a different client." };
    }
    if (profile.status !== "ACTIVE") {
      return { ok: false, message: "The destination profile is not active." };
    }
    return { ok: true };
  }
  if (card.destination_type === "EXTERNAL_URL") {
    if (!card.destination_url || validateSafeExternalUrl(card.destination_url) === null) {
      return { ok: false, message: "Set a valid external URL before activating." };
    }
    return { ok: true };
  }
  return { ok: false, message: "Configure a destination before activating." };
}

export async function setCardStatus(
  cardId: string,
  rawStatus: unknown,
  supabase: CardDb,
): Promise<CardResult<CardRow>> {
  if (!UUID_PATTERN.test(cardId)) return notFound("Card");
  const parsedStatus = cardStatusSchema.safeParse(rawStatus);
  if (!parsedStatus.success) {
    return invalid(parsedStatus.error.issues[0]?.message ?? "Choose a valid status.");
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { row, error } = await fetchCardRow(cardId, supabase);
  if (error) return failed("Could not update the status. Please try again.");
  if (!row) return notFound("Card");

  if (parsedStatus.data === "ACTIVE") {
    let profile: { client_id: string; status: string } | null = null;
    if (row.destination_type === "PROFILE" && row.destination_profile_id) {
      const { data } = await supabase
        .from("profiles")
        .select("client_id, status")
        .eq("id", row.destination_profile_id)
        .maybeSingle();
      profile = data;
    }
    const check = checkActivationReadiness(row, profile);
    if (!check.ok) return invalid(check.message);
  }

  const { data, error: updateError } = await supabase
    .from("cards")
    .update({ status: parsedStatus.data })
    .eq("id", cardId)
    .select(CARD_DETAIL_COLUMNS)
    .maybeSingle();

  if (updateError || !data) {
    if (!data && !updateError) return notFound("Card");
    return failed("Could not update the status. Please try again.");
  }
  return { ok: true, data };
}
