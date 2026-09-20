/**
 * Dashboard setup-status derivation (Phase 11).
 *
 * Pure helpers only — no database access, no JSX. The canonical domain
 * statuses (`DRAFT | ACTIVE | INACTIVE`, card statuses) stay unchanged;
 * these functions translate them into one human-readable setup summary so
 * the operator never has to decode raw DB states.
 *
 * Rules:
 * - A card counts as "configured" only when the primary card (existing
 *   primary-card rule in `features/cards/orchestrate`) is ACTIVE.
 *   LOST/REPLACED history never counts as an active setup.
 * - `ACTIVE profile + no card` is an optional setup opportunity, not a
 *   severe error — those clients work fine on their public profile link.
 */

export type SetupStatusKey =
  | "profile-missing"
  | "profile-draft"
  | "profile-inactive"
  | "nfc-missing"
  | "card-disabled"
  | "card-unusable"
  | "ready";

/** ready = done, attention = needs action, opportunity = optional setup. */
export type SetupSeverity = "ready" | "attention" | "opportunity";

export type ClientSetupStatus = {
  key: SetupStatusKey;
  /** Human label, e.g. "Profile missing", "NFC not configured", "Ready". */
  label: string;
  severity: SetupSeverity;
  /** Completed steps of Client → Profile → NFC. */
  stepsCompleted: 1 | 2 | 3;
  /** True only when the primary card is ACTIVE. */
  cardConfigured: boolean;
};

export function deriveClientSetupStatus(input: {
  /** Profile status, or null when the client has no profile. */
  profileStatus: string | null;
  /** Primary-card status, or null when the client has no usable card. */
  primaryCardStatus: string | null;
}): ClientSetupStatus {
  const { profileStatus, primaryCardStatus } = input;

  if (profileStatus !== "ACTIVE") {
    if (profileStatus === "DRAFT") {
      return {
        key: "profile-draft",
        label: "Profile draft",
        severity: "attention",
        stepsCompleted: 1,
        cardConfigured: false,
      };
    }
    if (profileStatus === "INACTIVE") {
      return {
        key: "profile-inactive",
        label: "Profile inactive",
        severity: "attention",
        stepsCompleted: 1,
        cardConfigured: false,
      };
    }
    return {
      key: "profile-missing",
      label: "Profile missing",
      severity: "attention",
      stepsCompleted: 1,
      cardConfigured: false,
    };
  }

  switch (primaryCardStatus) {
    case "ACTIVE":
      return {
        key: "ready",
        label: "Ready",
        severity: "ready",
        stepsCompleted: 3,
        cardConfigured: true,
      };
    case "DISABLED":
      return {
        key: "card-disabled",
        label: "Card disabled",
        severity: "attention",
        stepsCompleted: 2,
        cardConfigured: false,
      };
    case "LOST":
      return {
        key: "card-unusable",
        label: "Card lost",
        severity: "attention",
        stepsCompleted: 2,
        cardConfigured: false,
      };
    case "REPLACED":
      return {
        key: "card-unusable",
        label: "Card replaced",
        severity: "attention",
        stepsCompleted: 2,
        cardConfigured: false,
      };
    default:
      // No card, or a card that was never activated (UNASSIGNED/ASSIGNED) —
      // an optional opportunity, not an error: the public profile link works.
      return {
        key: "nfc-missing",
        label: "NFC not configured",
        severity: "opportunity",
        stepsCompleted: 2,
        cardConfigured: false,
      };
  }
}

export type AttentionItem = {
  clientId: string;
  clientName: string;
  company: string | null;
  /** Human reason, e.g. "Profile draft — not public yet". Never raw DB jargon. */
  reason: string;
  /** Direct action label, e.g. "Create Profile". */
  actionLabel: string;
  /** Where the action goes. */
  href: string;
  severity: SetupSeverity;
  primaryCardId: string | null;
};

/**
 * Map one client's setup state to a Needs-Attention item, or null when the
 * client is Ready. Every item carries a direct next-step action.
 */
export function toAttentionItem(input: {
  clientId: string;
  clientName: string;
  company: string | null;
  profileStatus: string | null;
  primaryCard: { id: string; status: string } | null;
}): AttentionItem | null {
  const setup = deriveClientSetupStatus({
    profileStatus: input.profileStatus,
    primaryCardStatus: input.primaryCard?.status ?? null,
  });
  const clientHref = `/dashboard/clients/${input.clientId}`;
  const base = {
    clientId: input.clientId,
    clientName: input.clientName,
    company: input.company,
    severity: setup.severity,
    primaryCardId: input.primaryCard?.id ?? null,
  };

  switch (setup.key) {
    case "ready":
      return null;
    case "profile-missing":
      return {
        ...base,
        reason: "No profile yet",
        actionLabel: "Create Profile",
        href: `${clientHref}/profile/new`,
      };
    case "profile-draft":
      return {
        ...base,
        reason: "Profile draft — not public yet",
        actionLabel: "Continue Editing",
        href: `${clientHref}/profile`,
      };
    case "profile-inactive":
      return {
        ...base,
        reason: "Profile inactive — not public",
        actionLabel: "Open Profile",
        href: `${clientHref}/profile`,
      };
    case "nfc-missing":
      return {
        ...base,
        reason: "NFC card not configured",
        actionLabel: "Configure NFC",
        href: `${clientHref}/nfc`,
      };
    case "card-disabled":
      return {
        ...base,
        reason: "Card disabled",
        actionLabel: "Open Card",
        href: input.primaryCard ? `/dashboard/cards/${input.primaryCard.id}` : clientHref,
      };
    case "card-unusable":
      return {
        ...base,
        reason:
          input.primaryCard?.status === "LOST"
            ? "Card lost — replacement needed"
            : "Card replaced — review setup",
        actionLabel: "Open Card",
        href: input.primaryCard ? `/dashboard/cards/${input.primaryCard.id}` : clientHref,
      };
  }
}

/**
 * StatusBadge key for the NFC column: Configured (green), the blocking
 * card status itself (Disabled/Lost/Replaced), otherwise Not configured.
 */
export function nfcBadgeStatus(setup: ClientSetupStatus, primaryCardStatus: string | null): string {
  if (setup.cardConfigured) return "CONFIGURED";
  if (
    primaryCardStatus === "DISABLED" ||
    primaryCardStatus === "LOST" ||
    primaryCardStatus === "REPLACED"
  ) {
    return primaryCardStatus;
  }
  return "NOT_CONFIGURED";
}

/** Human profile word for compact rows: Active / Draft / Inactive / Missing. */
export function humanProfileLabel(profileStatus: string | null): string {
  switch (profileStatus) {
    case "ACTIVE":
      return "Active";
    case "DRAFT":
      return "Draft";
    case "INACTIVE":
      return "Inactive";
    default:
      return "Missing";
  }
}

/** Human NFC word for compact rows: Configured / Disabled / Lost / … / Not configured. */
export function humanNfcLabel(setup: ClientSetupStatus, primaryCardStatus: string | null): string {
  if (setup.cardConfigured) return "Configured";
  switch (primaryCardStatus) {
    case "DISABLED":
      return "Disabled";
    case "LOST":
      return "Lost";
    case "REPLACED":
      return "Replaced";
    default:
      return "Not configured";
  }
}

export type DashboardCounts = {
  clients: number;
  activeProfiles: number;
  configuredCards: number;
  /** ACTIVE cards opening an external URL (direct-link mode). */
  directLinkCards: number;
  needsAttention: number;
};
