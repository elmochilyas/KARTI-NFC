import { describe, expect, it, vi } from "vitest";
import { getDashboardOverview, listClientsWithSetup, type OverviewDb } from "./overview";

/** Thenable query builder: awaiting it resolves to { data, error }. */
function tableFake(data: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "limit", "in", "or", "eq"]) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data, error: null });
  return builder;
}

function overviewFakeDb(
  tables: { clients: unknown[]; profiles: unknown[]; cards: unknown[] },
  claims: unknown = { sub: "admin" },
): OverviewDb {
  return {
    auth: {
      getClaims: async () => ({ data: { claims }, error: null }),
    },
    from: (table: string) => {
      if (table === "clients") return tableFake(tables.clients);
      if (table === "profiles") return tableFake(tables.profiles);
      if (table === "cards") return tableFake(tables.cards);
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as OverviewDb;
}

function strictFakeDb(): OverviewDb {
  return {
    auth: {
      getClaims: async () => ({ data: { claims: null }, error: null }),
    },
    from: () => {
      throw new Error("database must not be queried on this path");
    },
  } as unknown as OverviewDb;
}

function client(id: string, name: string, created_at: string) {
  return { id, name, company: `${name} Co`, phone: null, email: null, created_at };
}

/** Representative fixtures: A no profile · B DRAFT · C ACTIVE, no card · D ACTIVE+ACTIVE card · E ACTIVE+DISABLED card. */
const FIXTURES = {
  clients: [
    client("c-e", "Phase11 E", "2026-09-19T05:00:00Z"),
    client("c-d", "Phase11 D", "2026-09-19T04:00:00Z"),
    client("c-c", "Phase11 C", "2026-09-19T03:00:00Z"),
    client("c-b", "Phase11 B", "2026-09-19T02:00:00Z"),
    client("c-a", "Phase11 A", "2026-09-19T01:00:00Z"),
  ],
  profiles: [
    { client_id: "c-b", status: "DRAFT" },
    { client_id: "c-c", status: "ACTIVE" },
    { client_id: "c-d", status: "ACTIVE" },
    { client_id: "c-e", status: "ACTIVE" },
  ],
  cards: [
    {
      id: "card-d",
      client_id: "c-d",
      status: "ACTIVE",
      destination_type: "PROFILE",
      created_at: "2026-09-19T04:30:00Z",
    },
    {
      id: "card-e",
      client_id: "c-e",
      status: "DISABLED",
      destination_type: "PROFILE",
      created_at: "2026-09-19T05:30:00Z",
    },
  ],
};

describe("getDashboardOverview authorization", () => {
  it("requires authentication without touching the database", async () => {
    const from = vi.fn();
    const db = { ...strictFakeDb(), from } as unknown as OverviewDb;
    const result = await getDashboardOverview(db);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getDashboardOverview empty dashboard", () => {
  it("returns zeros and empty lists", async () => {
    const result = await getDashboardOverview(
      overviewFakeDb({ clients: [], profiles: [], cards: [] }),
    );
    expect(result).toEqual({
      ok: true,
      data: {
        counts: {
          clients: 0,
          activeProfiles: 0,
          configuredCards: 0,
          directLinkCards: 0,
          needsAttention: 0,
        },
        recentClients: [],
        attention: [],
        attentionTotal: 0,
      },
    });
  });
});

describe("getDashboardOverview fixtures A–E", () => {
  it("derives counts against known fixtures", async () => {
    const result = await getDashboardOverview(overviewFakeDb(FIXTURES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.counts).toEqual({
      clients: 5,
      activeProfiles: 3,
      configuredCards: 1,
      directLinkCards: 0,
      needsAttention: 4,
    });
  });

  it("orders attention: genuine setup work before optional NFC", async () => {
    const result = await getDashboardOverview(overviewFakeDb(FIXTURES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.attentionTotal).toBe(4);
    expect(result.data.attention.map((a) => a.clientName)).toEqual([
      "Phase11 E",
      "Phase11 B",
      "Phase11 A",
      "Phase11 C",
    ]);
    // D is Ready → absent; genuine setup work (E, B, A) sorts before C,
    // the optional NFC opportunity.
    expect(result.data.attention.map((a) => a.actionLabel)).toEqual([
      "Open Card",
      "Continue Editing",
      "Create Profile",
      "Configure NFC",
    ]);
  });

  it("enriches recent clients with profile and card context", async () => {
    const result = await getDashboardOverview(overviewFakeDb(FIXTURES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.recentClients).toHaveLength(5);
    const byName = new Map(result.data.recentClients.map((c) => [c.name, c]));
    expect(byName.get("Phase11 D")?.setup.key).toBe("ready");
    expect(byName.get("Phase11 C")?.setup.key).toBe("nfc-missing");
    expect(byName.get("Phase11 A")?.profileStatus).toBeNull();
  });
});

describe("getDashboardOverview direct-link cards", () => {
  it("counts active external-URL cards separately", async () => {
    const result = await getDashboardOverview(
      overviewFakeDb({
        clients: [client("c-x", "Phase11 X", "2026-09-19T06:00:00Z")],
        profiles: [{ client_id: "c-x", status: "ACTIVE" }],
        cards: [
          {
            id: "card-x",
            client_id: "c-x",
            status: "ACTIVE",
            destination_type: "EXTERNAL_URL",
            created_at: "2026-09-19T06:30:00Z",
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.counts.configuredCards).toBe(1);
    expect(result.data.counts.directLinkCards).toBe(1);
    expect(result.data.attentionTotal).toBe(0);
  });
});

describe("listClientsWithSetup", () => {
  it("requires authentication", async () => {
    const result = await listClientsWithSetup({ query: "" }, strictFakeDb());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });

  it("attaches profile and primary-card status to each row", async () => {
    const result = await listClientsWithSetup({ query: "" }, overviewFakeDb(FIXTURES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byName = new Map(result.data.map((c) => [c.name, c]));
    expect(byName.get("Phase11 A")).toMatchObject({
      profileStatus: null,
      primaryCardStatus: null,
    });
    expect(byName.get("Phase11 D")).toMatchObject({
      profileStatus: "ACTIVE",
      primaryCardStatus: "ACTIVE",
    });
    expect(byName.get("Phase11 D")?.setup.key).toBe("ready");
    expect(byName.get("Phase11 E")?.setup.key).toBe("card-disabled");
  });
});
