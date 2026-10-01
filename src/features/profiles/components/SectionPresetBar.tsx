"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type SectionPreset = {
  id: string;
  label: string;
  description: string;
  settings: Record<string, unknown>;
};

/**
 * True when every key in the preset matches the current settings.
 * Presets are partial (e.g. `{ display: "tiles" }`) while current
 * settings carry unrelated keys — so partial-match, never full equality.
 * An empty preset never counts as active.
 */
export function isPresetActive(
  presetSettings: Record<string, unknown>,
  currentSettings: Record<string, unknown>,
): boolean {
  const keys = Object.keys(presetSettings);
  if (keys.length === 0) return false;
  return keys.every((key) => currentSettings[key] === presetSettings[key]);
}

/**
 * One-tap section presets (Phase 33). Renders the catalog preset buttons
 * for a section type; applying merges the preset over the current settings
 * and saves through the standard path (validation still applies).
 *
 * The active preset stays visibly selected (`aria-pressed` + check icon,
 * never color alone) so operators get immediate UI/UX feedback on click.
 * Pass `currentSettings` (preferred) or an explicit `activeId` override.
 */
export function SectionPresetBar({
  typeLabel,
  presets,
  pending,
  currentSettings,
  activeId,
  onApply,
}: {
  typeLabel: string;
  presets: SectionPreset[];
  pending: boolean;
  currentSettings?: Record<string, unknown>;
  activeId?: string | null;
  onApply: (presetId: string, settings: Record<string, unknown>) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-2 text-[13px] font-semibold text-muted">Presets for {typeLabel}</p>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {presets.map((preset) => {
          const active =
            activeId !== undefined && activeId !== null
              ? activeId === preset.id
              : currentSettings
                ? isPresetActive(preset.settings, currentSettings)
                : false;
          return (
            <Button
              key={preset.id}
              type="button"
              variant={active ? "primary" : "secondary"}
              disabled={pending}
              onClick={() => onApply(preset.id, preset.settings)}
              title={preset.description}
              aria-pressed={active}
              aria-label={
                active
                  ? `Apply ${preset.label} preset (active)`
                  : `Apply ${preset.label} preset`
              }
            >
              {active ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
              {preset.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
