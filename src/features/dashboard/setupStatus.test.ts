import { describe, expect, it } from "vitest";
import {
  deriveClientSetupStatus,
  humanNfcLabel,
  humanProfileLabel,
  nfcBadgeStatus,
  toAttentionItem,
} from "./setupStatus";

const client = { clientId: "client-1", clientName: "Atlas Dental", company: "Atlas" };

describe("deriveClientSetupStatus", () => {
  it("reports profile missing when there is no profile", () => {
    expect(deriveClientSetupStatus({ profileStatus: null, primaryCardStatus: null })).toEqual({
      key: "profile-missing",
      label: "Profile missing",
      severity: "attention",
      stepsCompleted: 1,
      cardConfigured: false,
    });
  });

  it("reports a draft profile as needing attention", () => {
    expect(
      deriveClientSetupStatus({ profileStatus: "DRAFT", primaryCardStatus: null }),
    ).toMatchObject({ key: "profile-draft", label: "Profile draft", stepsCompleted: 1 });
  });

  it("reports an inactive profile as needing attention", () => {
    expect(
      deriveClientSetupStatus({ profileStatus: "INACTIVE", primaryCardStatus: null }),
    ).toMatchObject({ key: "profile-inactive", label: "Profile inactive" });
  });

  it("treats an active profile with no card as an opportunity, not an error", () => {
    expect(deriveClientSetupStatus({ profileStatus: "ACTIVE", primaryCardStatus: null })).toEqual({
      key: "nfc-missing",
      label: "NFC not configured",
      severity: "opportunity",
      stepsCompleted: 2,
      cardConfigured: false,
    });
  });

  it("treats an assigned-but-never-activated card as not configured", () => {
    for (const status of ["UNASSIGNED", "ASSIGNED"]) {
      expect(
        deriveClientSetupStatus({ profileStatus: "ACTIVE", primaryCardStatus: status }),
      ).toMatchObject({ key: "nfc-missing", severity: "opportunity", cardConfigured: false });
    }
  });

  it("reports ready only for an active profile with an active primary card", () => {
    expect(
      deriveClientSetupStatus({ profileStatus: "ACTIVE", primaryCardStatus: "ACTIVE" }),
    ).toEqual({
      key: "ready",
      label: "Ready",
      severity: "ready",
      stepsCompleted: 3,
      cardConfigured: true,
    });
  });

  it("reports a disabled card as needing attention", () => {
    expect(
      deriveClientSetupStatus({ profileStatus: "ACTIVE", primaryCardStatus: "DISABLED" }),
    ).toMatchObject({ key: "card-disabled", label: "Card disabled", severity: "attention" });
  });

  it("never counts lost/replaced history as a configured setup", () => {
    for (const status of ["LOST", "REPLACED"]) {
      const derived = deriveClientSetupStatus({
        profileStatus: "ACTIVE",
        primaryCardStatus: status,
      });
      expect(derived.key).toBe("card-unusable");
      expect(derived.cardConfigured).toBe(false);
      expect(derived.severity).toBe("attention");
    }
  });
});

describe("toAttentionItem", () => {
  it("returns null for a ready client", () => {
    expect(
      toAttentionItem({
        ...client,
        profileStatus: "ACTIVE",
        primaryCard: { id: "card-1", status: "ACTIVE" },
      }),
    ).toBeNull();
  });

  it("links a profile-less client to profile creation", () => {
    expect(toAttentionItem({ ...client, profileStatus: null, primaryCard: null })).toMatchObject({
      reason: "No profile yet",
      actionLabel: "Create Profile",
      href: "/dashboard/clients/client-1/profile/new",
    });
  });

  it("links a draft profile to continue editing", () => {
    expect(toAttentionItem({ ...client, profileStatus: "DRAFT", primaryCard: null })).toMatchObject(
      {
        actionLabel: "Continue Editing",
        href: "/dashboard/clients/client-1/profile",
      },
    );
  });

  it("links an active profile without a card to NFC configuration", () => {
    expect(
      toAttentionItem({ ...client, profileStatus: "ACTIVE", primaryCard: null }),
    ).toMatchObject({
      reason: "NFC card not configured",
      actionLabel: "Configure NFC",
      href: "/dashboard/clients/client-1/nfc",
      severity: "opportunity",
    });
  });

  it("links a disabled card to the card record", () => {
    expect(
      toAttentionItem({
        ...client,
        profileStatus: "ACTIVE",
        primaryCard: { id: "card-9", status: "DISABLED" },
      }),
    ).toMatchObject({
      reason: "Card disabled",
      actionLabel: "Open Card",
      href: "/dashboard/cards/card-9",
    });
  });
});

describe("nfcBadgeStatus", () => {
  it("maps setup states to one consistent badge vocabulary", () => {
    const ready = deriveClientSetupStatus({
      profileStatus: "ACTIVE",
      primaryCardStatus: "ACTIVE",
    });
    expect(nfcBadgeStatus(ready, "ACTIVE")).toBe("CONFIGURED");
    const missing = deriveClientSetupStatus({
      profileStatus: "ACTIVE",
      primaryCardStatus: null,
    });
    expect(nfcBadgeStatus(missing, null)).toBe("NOT_CONFIGURED");
    const disabled = deriveClientSetupStatus({
      profileStatus: "ACTIVE",
      primaryCardStatus: "DISABLED",
    });
    expect(nfcBadgeStatus(disabled, "DISABLED")).toBe("DISABLED");
  });
});

describe("human labels", () => {
  it("never exposes raw status caps in compact rows", () => {
    expect(humanProfileLabel("ACTIVE")).toBe("Active");
    expect(humanProfileLabel("DRAFT")).toBe("Draft");
    expect(humanProfileLabel(null)).toBe("Missing");
    const ready = deriveClientSetupStatus({
      profileStatus: "ACTIVE",
      primaryCardStatus: "ACTIVE",
    });
    expect(humanNfcLabel(ready, "ACTIVE")).toBe("Configured");
    const missing = deriveClientSetupStatus({
      profileStatus: "ACTIVE",
      primaryCardStatus: null,
    });
    expect(humanNfcLabel(missing, null)).toBe("Not configured");
  });
});

describe("toAttentionItem human language", () => {
  it("uses human language, never raw destination jargon", () => {
    const items = [
      toAttentionItem({ ...client, profileStatus: null, primaryCard: null }),
      toAttentionItem({ ...client, profileStatus: "ACTIVE", primaryCard: null }),
    ];
    for (const item of items) {
      expect(item?.reason).not.toMatch(/destination_type|null/i);
    }
  });
});
