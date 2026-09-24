import { z } from "zod";

/**
 * Phase 34 unified-save planner — pure diff logic for the single persist
 * path. The server action executes the plan against the existing services
 * (creates/updates/deletes/toggles/exact-set reorder); this module decides
 * WHAT must run so it stays unit-testable without a database.
 */

export const unifiedDraftLinkSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(40),
  label: z.string().max(200),
  url: z.string().max(2048),
  enabled: z.boolean(),
  sort_order: z.number().int().min(0).max(1000),
});

export const unifiedDraftSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(40),
  position: z.number().int().min(0).max(1000),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
});

export const unifiedSavePayloadSchema = z.object({
  profile: z.record(z.string(), z.string()),
  previousAvatarPath: z.string().max(500),
  previousCoverPath: z.string().max(500),
  newProfileId: z.string().max(100).nullable(),
  template: z.string().max(60),
  links: z.array(unifiedDraftLinkSchema).max(100),
  deletedLinkIds: z.array(z.string().max(100)).max(100),
  sections: z.array(unifiedDraftSectionSchema).max(30),
  deletedSectionIds: z.array(z.string().max(100)).max(30),
});

export type UnifiedSavePayload = z.infer<typeof unifiedSavePayloadSchema>;
export type UnifiedDraftLink = UnifiedSavePayload["links"][number];
export type UnifiedDraftSection = UnifiedSavePayload["sections"][number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDraftTempId(id: string): boolean {
  return id.startsWith("draft-");
}

export type PlanResult<T> = { ok: true; plan: T } | { ok: false; message: string };

export type LinksPlan = {
  creates: { tempId: string; type: string; label: string; url: string; enabled: boolean }[];
  updates: { id: string; type: string; label: string; url: string }[];
  toggles: { id: string; enabled: boolean }[];
  deletes: string[];
  /** Draft end-state order (temp ids included — the caller maps them first). */
  order: string[];
};

export type CurrentLink = {
  id: string;
  type: string;
  label: string;
  url: string;
  enabled: boolean;
};

/**
 * Diff draft links against current rows. Fail-closed: a persisted id the
 * server no longer has means someone else changed the data — the operator
 * reloads instead of silently resurrecting or dropping rows.
 */
export function planLinksDiff(
  current: CurrentLink[],
  links: UnifiedDraftLink[],
  deletedIds: string[],
): PlanResult<LinksPlan> {
  const byId = new Map(current.map((l) => [l.id, l]));
  const deletes = deletedIds.filter((id) => UUID_PATTERN.test(id) && byId.has(id));
  for (const id of deletes) byId.delete(id);

  const creates: LinksPlan["creates"] = [];
  const updates: LinksPlan["updates"] = [];
  const toggles: LinksPlan["toggles"] = [];
  const order: string[] = [];

  for (const link of links) {
    order.push(link.id);
    if (isDraftTempId(link.id)) {
      creates.push({
        tempId: link.id,
        type: link.type,
        label: link.label,
        url: link.url,
        enabled: link.enabled,
      });
      continue;
    }
    if (!UUID_PATTERN.test(link.id)) {
      return { ok: false, message: "Check the links — one entry looks invalid." };
    }
    const existing = byId.get(link.id);
    if (!existing) {
      return { ok: false, message: "Links changed elsewhere. Reload and try again." };
    }
    if (existing.type !== link.type || existing.label !== link.label || existing.url !== link.url) {
      updates.push({ id: link.id, type: link.type, label: link.label, url: link.url });
    }
    if (existing.enabled !== link.enabled) {
      toggles.push({ id: link.id, enabled: link.enabled });
    }
  }
  return { ok: true, plan: { creates, updates, toggles, deletes, order } };
}

export type SectionsPlan = {
  adds: { tempId: string; type: string; enabled: boolean; settings: Record<string, unknown> }[];
  settingsUpdates: { id: string; settings: Record<string, unknown> }[];
  toggles: { id: string; enabled: boolean }[];
  deletes: string[];
  /** Draft end-state order (temp ids included — the caller maps them first). */
  order: string[];
};

export type CurrentSection = {
  id: string;
  type: string;
  enabled: boolean;
  settings: unknown;
};

export function planSectionsDiff(
  current: CurrentSection[],
  sections: UnifiedDraftSection[],
  deletedIds: string[],
): PlanResult<SectionsPlan> {
  const byId = new Map(current.map((s) => [s.id, s]));
  const deletes = deletedIds.filter((id) => UUID_PATTERN.test(id) && byId.has(id));
  for (const id of deletes) byId.delete(id);

  const adds: SectionsPlan["adds"] = [];
  const settingsUpdates: SectionsPlan["settingsUpdates"] = [];
  const toggles: SectionsPlan["toggles"] = [];
  const order: string[] = [];

  for (const section of sections) {
    order.push(section.id);
    if (isDraftTempId(section.id)) {
      adds.push({
        tempId: section.id,
        type: section.type,
        enabled: section.enabled,
        settings: section.settings,
      });
      continue;
    }
    if (!UUID_PATTERN.test(section.id)) {
      return { ok: false, message: "Check the sections — one entry looks invalid." };
    }
    const existing = byId.get(section.id);
    if (!existing) {
      return { ok: false, message: "Sections changed elsewhere. Reload and try again." };
    }
    if (JSON.stringify(existing.settings ?? {}) !== JSON.stringify(section.settings)) {
      settingsUpdates.push({ id: section.id, settings: section.settings });
    }
    if (existing.enabled !== section.enabled) {
      toggles.push({ id: section.id, enabled: section.enabled });
    }
  }
  return { ok: true, plan: { adds, settingsUpdates, toggles, deletes, order } };
}

/**
 * Map a draft order containing temp ids to real ids after creates.
 * Returns null when a temp id has no mapping (caller treats it as a bug).
 */
export function mapDraftOrder(order: string[], tempToReal: Map<string, string>): string[] | null {
  const mapped: string[] = [];
  for (const id of order) {
    if (isDraftTempId(id)) {
      const real = tempToReal.get(id);
      if (!real) return null;
      mapped.push(real);
    } else {
      mapped.push(id);
    }
  }
  return mapped;
}
