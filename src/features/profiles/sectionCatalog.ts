import {
  Briefcase,
  Clock,
  FileText,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  MapPin,
  User,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Json } from "@/types/database";
import {
  ActionsSettingsEditor,
  CvSettingsEditor,
  ExperienceSettingsEditor,
  AboutSettingsEditor,
  GallerySettingsEditor,
  HeroSettingsEditor,
  LinksSettingsEditor,
  LocationSettingsEditor,
  OpeningHoursSettingsEditor,
} from "./components/section-settings/SectionEditors";
import {
  CatalogSettingsEditor,
  MenuSettingsEditor,
} from "./components/section-settings/CollectionEditor";

export type SectionCategory = "core" | "business" | "personal" | "media";

export type SectionStatus = "live" | "planned";

export type SupportedProfile = "PERSON" | "BUSINESS" | "RESTAURANT";

/** Props every section settings editor receives. */
export type SectionSettingsProps = {
  settings: Record<string, unknown>;
  pending: boolean;
  /**
   * Legacy explicit commit (service mode). Draft mode passes `onChange`
   * instead and ignores this — editors must call one of them, never both
   * for the same edit. New code uses `onChange` exclusively.
   */
  onSave: (settings: Record<string, unknown>) => void;
  /**
   * Draft-live commit (Phase 34.2 unified editor): called on EVERY edit so
   * the shared draft and live preview update with no save button. When
   * present, editors render no persistence affordance of their own.
   */
  onChange?: (settings: Record<string, unknown>) => void;
  /** Focus the first meaningful field on mount (newly added sections). */
  autoFocus?: boolean;
  /**
   * Item-image uploads need the storage scope; absent in static tests.
   * The uploader is injected (never imported) so this registry stays free
   * of server-action imports — client components and server services alike
   * can import the catalog without tripping the server-only boundary.
   */
  context?: {
    clientId: string;
    profileId: string;
    sectionType: string;
    uploadImage: (file: File) => Promise<{
      ok: boolean;
      path?: string;
      publicUrl?: string;
      message: string;
    }>;
    uploadDocument?: (file: File) => Promise<{
      ok: boolean;
      path?: string;
      message: string;
    }>;
    /**
     * Map-link → coordinates resolution (Phase 34.4 Location). Injected
     * (never imported) so the catalog stays free of server-action imports
     * — same boundary as the uploaders. Absent in static tests. Extra
     * success fields (provider/normalizedUrl) are ignored by the editor,
     * which commits latitude/longitude plus pinSource only.
     */
    resolveMapsLink?: (url: string) => Promise<
      | {
          ok: true;
          latitude: number;
          longitude: number;
          resolvedUrl: string;
          provider?: string;
          normalizedUrl?: string;
        }
      | { ok: false; message: string }
    >;
  };
};

/**
 * Section catalog — the data half of the section registry (Phase 26+27).
 *
 * Catalog entries are plain data plus icon/editor component references.
 * Services import only the data selectors; the public component map lives
 * in `ProfileSections.tsx` (`resolveSection`) so admin bundles never absorb
 * public-profile render code (see ADR-052). Settings editors are referenced
 * here so `SectionSettingsRenderer` can load them dynamically (ADR-053).
 */
export type SectionCatalogEntry = {
  type: string;
  label: string;
  description: string;
  category: SectionCategory;
  status: SectionStatus;
  icon: LucideIcon;
  /** Placeholder shape until the section ships its own settings UI. */
  defaultSettings: Json;
  /** Every catalog type is singleton-per-profile (DB UNIQUE, ADR-052). */
  singleton: true;
  /** Editor rendered by SectionSettingsRenderer; null until implemented. */
  settingsComponent: ComponentType<SectionSettingsProps> | null;
  /** Profile types allowed to carry this section (enforced on add). */
  supportedProfiles: SupportedProfile[];
  /**
   * One-tap presets: partial settings applied over the current values.
   * Every preset must satisfy the type's settings schema (pinned by test).
   */
  presets?: { id: string; label: string; description: string; settings: Record<string, unknown> }[];
};

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Cover, photo, name and tagline.",
    category: "core",
    status: "live",
    icon: LayoutTemplate,
    defaultSettings: {},
    singleton: true,
    settingsComponent: HeroSettingsEditor,
    supportedProfiles: ["PERSON", "BUSINESS"],
  },
  {
    type: "actions",
    label: "Quick actions & info",
    description: "Call, WhatsApp and contact information.",
    category: "core",
    status: "live",
    icon: Zap,
    defaultSettings: {},
    singleton: true,
    settingsComponent: ActionsSettingsEditor,
    supportedProfiles: ["PERSON", "BUSINESS"],
    presets: [
      {
        id: "tiles",
        label: "Tiles",
        description: "Visual cards in a row.",
        settings: { display: "tiles" },
      },
      {
        id: "buttons",
        label: "Buttons",
        description: "Full-width action buttons.",
        settings: { display: "buttons" },
      },
    ],
  },
  {
    type: "links",
    label: "Links",
    description: "Social and external link rows.",
    category: "core",
    status: "live",
    icon: Link2,
    defaultSettings: {},
    singleton: true,
    settingsComponent: LinksSettingsEditor,
    supportedProfiles: ["PERSON", "BUSINESS"],
  },
  {
    type: "location",
    label: "Location",
    description: "Map and directions block.",
    category: "business",
    status: "live",
    icon: MapPin,
    defaultSettings: {},
    singleton: true,
    settingsComponent: LocationSettingsEditor,
    supportedProfiles: ["BUSINESS"],
  },
  {
    type: "opening_hours",
    label: "Opening Hours",
    description: "Weekly opening hours table.",
    category: "business",
    status: "live",
    icon: Clock,
    defaultSettings: {},
    singleton: true,
    settingsComponent: OpeningHoursSettingsEditor,
    supportedProfiles: ["BUSINESS"],
  },
  {
    type: "menu",
    label: "Menu",
    description: "Food and drink menu list.",
    category: "business",
    status: "live",
    icon: UtensilsCrossed,
    defaultSettings: {},
    singleton: true,
    settingsComponent: MenuSettingsEditor,
    supportedProfiles: ["RESTAURANT", "BUSINESS"],
    presets: [
      {
        id: "cards",
        label: "Cards",
        description: "Photo cards per item.",
        settings: { layout: "cards" },
      },
      {
        id: "list",
        label: "List",
        description: "Compact rows without photos.",
        settings: { layout: "list" },
      },
    ],
  },
  {
    type: "catalog",
    label: "Catalog",
    description: "Product or service catalog grid.",
    category: "business",
    status: "live",
    icon: LayoutGrid,
    defaultSettings: {},
    singleton: true,
    settingsComponent: CatalogSettingsEditor,
    supportedProfiles: ["BUSINESS"],
  },
  {
    type: "about",
    label: "About",
    description: "Long-form personal biography.",
    category: "personal",
    status: "live",
    icon: User,
    defaultSettings: {},
    singleton: true,
    settingsComponent: AboutSettingsEditor,
    supportedProfiles: ["PERSON"],
  },
  {
    type: "cv",
    label: "CV",
    description: "Downloadable curriculum vitae.",
    category: "personal",
    status: "live",
    icon: FileText,
    defaultSettings: {},
    singleton: true,
    settingsComponent: CvSettingsEditor,
    supportedProfiles: ["PERSON"],
  },
  {
    type: "experience",
    label: "Experience",
    description: "Work history timeline.",
    category: "personal",
    status: "live",
    icon: Briefcase,
    defaultSettings: {},
    singleton: true,
    settingsComponent: ExperienceSettingsEditor,
    supportedProfiles: ["PERSON"],
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Photo gallery strip.",
    category: "media",
    status: "live",
    icon: Images,
    defaultSettings: {},
    singleton: true,
    settingsComponent: GallerySettingsEditor,
    supportedProfiles: ["PERSON", "BUSINESS"],
    presets: [
      {
        id: "grid",
        label: "Grid",
        description: "Even square tiles.",
        settings: { layout: "grid" },
      },
      {
        id: "masonry",
        label: "Masonry",
        description: "Flowing columns.",
        settings: { layout: "masonry" },
      },
    ],
  },
];

export const SECTION_CATEGORIES: { id: SectionCategory; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "business", label: "Business" },
  { id: "personal", label: "Personal" },
  { id: "media", label: "Media" },
];

export function getCatalogEntry(type: string): SectionCatalogEntry | null {
  return SECTION_CATALOG.find((entry) => entry.type === type) ?? null;
}

/** Registry-known type (migration CHECK) — gates the ownership helpers. */
export function isKnownSectionType(value: unknown): boolean {
  return typeof value === "string" && SECTION_CATALOG.some((entry) => entry.type === value);
}

/** Foundation trio — structural, never deletable (ADR-052). */
export function isFoundationSectionType(type: string): boolean {
  return type === "hero" || type === "actions" || type === "links";
}

export function plannedCatalogEntries(): SectionCatalogEntry[] {
  return SECTION_CATALOG.filter((entry) => entry.status === "planned");
}

export function catalogEntriesByCategory(): { category: string; entries: SectionCatalogEntry[] }[] {
  return SECTION_CATEGORIES.map((category) => ({
    category: category.label,
    entries: SECTION_CATALOG.filter((entry) => entry.category === category.id),
  }));
}

/**
 * Pure order helper behind both the drag-and-drop path and the button path
 * in SectionsManager: move `id` to `toIndex` (clamped). Lives here (not in
 * the client component) so it stays importable from server-safe modules
 * and unit-testable without a DOM.
 */
export function moveSectionId(ids: string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const clamped = Math.max(0, Math.min(toIndex, ids.length - 1));
  if (clamped === from) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(clamped, 0, moved);
  return next;
}
