import type { SupabaseClient } from "@supabase/supabase-js";
import { listClients } from "@/features/clients/service";
import type { ClientSummary } from "@/features/clients/types";
import { pickPrimaryCard } from "@/features/cards/orchestrate";
import type { Database } from "@/types/database";
import {
  deriveClientSetupStatus,
  toAttentionItem,
  type AttentionItem,
  type ClientSetupStatus,
  type DashboardCounts,
} from "./setupStatus";

export type OverviewDb = SupabaseClient<Database>;

export type OverviewErrorCode = "UNAUTHORIZED" | "UNKNOWN";

export type OverviewResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: OverviewErrorCode; message: string } };

export type OverviewClient = {
  id: string;
  name: string;
  company: string | null;
  profileStatus: string | null;
  primaryCard: { id: string; status: string } | null;
  setup: ClientSetupStatus;
};

export type DashboardOverview = {
  counts: DashboardCounts;
  recentClients: OverviewClient[];
  /** Capped attention list — see `attentionTotal` for the full count. */
  attention: AttentionItem[];
  attentionTotal: number;
};

export type ClientWithSetup = ClientSummary & {
  profileStatus: string | null;
  primaryCardStatus: string | null;
  setup: ClientSetupStatus;
};

export const RECENT_CLIENTS_LIMIT = 5;
export const ATTENTION_LIMIT = 6;
/** Batch projections stay small; MVP lists are capped at 100 clients. */
const MAX_BATCH_ROWS = 500;

type CardProjection = {
  id: string;
  client_id: string | null;
  status: string;
  destination_type: string | null;
  created_at: string;
};

/**
 * Dashboard reads stay authenticated/RLS-backed — no service-role use.
 * Page-level protection is an additional layer, not the check.
 */
async function requireAdmin(supabase: OverviewDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED: OverviewResult<never> = {
  ok: false,
  error: { code: "UNAUTHORIZED", message: "Sign in to view the dashboard." },
};

function failed(message: string): OverviewResult<never> {
  return { ok: false, error: { code: "UNKNOWN", message } };
}

/**
 * Two small batched queries — profile statuses and card rows for exactly
 * the given clients. Never per-client loops (no N+1), never full profile
 * bodies, links, notes, or card histories.
 */
async function fetchSetupMaps(
  supabase: OverviewDb,
  clientIds: string[],
): Promise<{
  profileByClient: Map<string, string>;
  primaryByClient: Map<string, CardProjection>;
  allCards: CardProjection[];
} | null> {
  const profileByClient = new Map<string, string>();
  const allCards: CardProjection[] = [];
  if (clientIds.length === 0) {
    return { profileByClient, primaryByClient: new Map(), allCards };
  }

  const [profilesResult, cardsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("client_id, status")
      .in("client_id", clientIds)
      .limit(MAX_BATCH_ROWS),
    supabase
      .from("cards")
      .select("id, client_id, status, destination_type, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .limit(MAX_BATCH_ROWS),
  ]);

  if (profilesResult.error || cardsResult.error) return null;

  for (const row of profilesResult.data ?? []) {
    if (row.client_id && !profileByClient.has(row.client_id)) {
      profileByClient.set(row.client_id, row.status);
    }
  }
  const byClient = new Map<string, CardProjection[]>();
  for (const row of (cardsResult.data ?? []) as CardProjection[]) {
    if (!row.client_id) continue;
    allCards.push(row);
    const list = byClient.get(row.client_id) ?? [];
    list.push(row);
    byClient.set(row.client_id, list);
  }
  const primaryByClient = new Map<string, CardProjection>();
  for (const [clientId, cards] of byClient) {
    const primary = pickPrimaryCard(cards);
    if (primary) primaryByClient.set(clientId, primary);
  }
  return { profileByClient, primaryByClient, allCards };
}

function enrichClient(
  client: ClientSummary,
  profileByClient: Map<string, string>,
  primaryByClient: Map<string, CardProjection>,
): OverviewClient {
  const profileStatus = profileByClient.get(client.id) ?? null;
  const primary = primaryByClient.get(client.id) ?? null;
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    profileStatus,
    primaryCard: primary ? { id: primary.id, status: primary.status } : null,
    setup: deriveClientSetupStatus({
      profileStatus,
      primaryCardStatus: primary?.status ?? null,
    }),
  };
}

/**
 * One operational snapshot for `/dashboard`: counts, recent clients with
 * setup context, and needs-attention items. Costs exactly 3 small queries
 * (clients + batched profiles + batched cards) regardless of client count.
 */
export async function getDashboardOverview(
  supabase: OverviewDb,
): Promise<OverviewResult<DashboardOverview>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const clientsResult = await listClients({ query: "" }, supabase);
  if (!clientsResult.ok) {
    return failed("We couldn't load your clients. Try again.");
  }
  const clients = clientsResult.data;
  const maps = await fetchSetupMaps(
    supabase,
    clients.map((c) => c.id),
  );
  if (!maps) {
    return failed("We couldn't load your dashboard. Try again.");
  }

  const enriched = clients.map((c) => enrichClient(c, maps.profileByClient, maps.primaryByClient));

  const activeProfiles = [...maps.profileByClient.values()].filter((s) => s === "ACTIVE").length;
  const configuredCards = enriched.filter((c) => c.setup.cardConfigured).length;
  const directLinkCards = maps.allCards.filter(
    (c) => c.status === "ACTIVE" && c.destination_type === "EXTERNAL_URL",
  ).length;

  const allAttention: AttentionItem[] = [];
  for (const c of enriched) {
    const item = toAttentionItem({
      clientId: c.id,
      clientName: c.name,
      company: c.company,
      profileStatus: c.profileStatus,
      primaryCard: c.primaryCard,
    });
    if (item) allAttention.push(item);
  }
  // Genuine problems first, optional NFC opportunities last.
  const orderedAttention = [
    ...allAttention.filter((a) => a.severity === "attention"),
    ...allAttention.filter((a) => a.severity === "opportunity"),
  ];

  return {
    ok: true,
    data: {
      counts: {
        clients: clients.length,
        activeProfiles,
        configuredCards,
        directLinkCards,
        needsAttention: allAttention.length,
      },
      recentClients: enriched.slice(0, RECENT_CLIENTS_LIMIT),
      attention: orderedAttention.slice(0, ATTENTION_LIMIT),
      attentionTotal: allAttention.length,
    },
  };
}

/**
 * Client list rows with profile + primary-card context, preserving the
 * existing name/company/phone/email search. Same 3-query batch pattern.
 */
export async function listClientsWithSetup(
  options: { query?: string },
  supabase: OverviewDb,
): Promise<OverviewResult<ClientWithSetup[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const clientsResult = await listClients(options, supabase);
  if (!clientsResult.ok) {
    return failed("We couldn't load your clients. Try again.");
  }
  const maps = await fetchSetupMaps(
    supabase,
    clientsResult.data.map((c) => c.id),
  );
  if (!maps) {
    return failed("We couldn't load your clients. Try again.");
  }

  return {
    ok: true,
    data: clientsResult.data.map((c) => {
      const profileStatus = maps.profileByClient.get(c.id) ?? null;
      const primary = maps.primaryByClient.get(c.id) ?? null;
      return {
        ...c,
        profileStatus,
        primaryCardStatus: primary?.status ?? null,
        setup: deriveClientSetupStatus({
          profileStatus,
          primaryCardStatus: primary?.status ?? null,
        }),
      };
    }),
  };
}
