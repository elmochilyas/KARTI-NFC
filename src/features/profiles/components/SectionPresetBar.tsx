"use client";

import { Button } from "@/components/ui/Button";

/**
 * One-tap section presets (Phase 33). Renders the catalog preset buttons
 * for a section type; applying merges the preset over the current settings
 * and saves through the standard path (validation still applies).
 */
export function SectionPresetBar({
  typeLabel,
  presets,
  pending,
  onApply,
}: {
  typeLabel: string;
  presets: { id: string; label: string; description: string; settings: Record<string, unknown> }[];
  pending: boolean;
  onApply: (presetId: string, settings: Record<string, unknown>) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-2 text-[13px] font-semibold text-muted">Presets for {typeLabel}</p>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => onApply(preset.id, preset.settings)}
            title={preset.description}
            aria-label={`Apply ${preset.label} preset`}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
