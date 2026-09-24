"use client";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { getCatalogEntry } from "@/features/profiles/sectionCatalog";
import { DEFAULT_ACCENT } from "@/features/profiles/unifiedDraft";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { SectionPresetBar } from "../SectionPresetBar";

/**
 * Phase 34 — Step 5 Appearance. Presentation only: theme, accent, and the
 * visual presets of the sections that support them. Content editing lives
 * in the earlier steps.
 */
export function AppearanceStep() {
  const { draft, dispatch, saveState } = useUnifiedEditor();
  const fieldErrors = saveState.fieldErrors;

  const accent = /^#[0-9a-f]{6}$/i.test(draft.fields.accent_color)
    ? draft.fields.accent_color
    : DEFAULT_ACCENT;

  const galleryRow = draft.sections.find((s) => s.type === "gallery") ?? null;
  const menuRow = draft.sections.find((s) => s.type === "menu") ?? null;
  const galleryPresets = getCatalogEntry("gallery")?.presets ?? [];
  const menuPresets = getCatalogEntry("menu")?.presets ?? [];

  return (
    <section
      aria-label="Appearance"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-base font-semibold text-text">Appearance</h2>
      <p className="mt-1 text-sm text-muted">Theme and accent color. The preview updates live.</p>
      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p id="profile-theme-label" className="text-sm font-medium text-text">
            Theme
          </p>
          <div
            role="radiogroup"
            aria-labelledby="profile-theme-label"
            aria-describedby={fieldErrors?.theme ? "profile-theme-error" : undefined}
            aria-invalid={Boolean(fieldErrors?.theme) || undefined}
            className="mt-2 flex gap-2"
          >
            {(["light", "dark"] as const).map((theme) => (
              <label
                key={theme}
                className={`radio-card inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium capitalize ${
                  draft.fields.theme === theme
                    ? "border-accent bg-surface text-text"
                    : "border-border text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={draft.fields.theme === theme}
                  onChange={() => dispatch({ type: "setField", field: "theme", value: theme })}
                  className="sr-only"
                />
                {theme}
              </label>
            ))}
          </div>
          {fieldErrors?.theme ? (
            <p
              id="profile-theme-error"
              role="alert"
              className="mt-1 text-sm font-medium text-danger"
            >
              {fieldErrors.theme}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="profile-accent-picker" className="text-sm font-medium text-text">
              Accent color
            </label>
            <input
              id="profile-accent-picker"
              type="color"
              value={accent}
              onChange={(e) =>
                dispatch({ type: "setField", field: "accent_color", value: e.target.value })
              }
              className="mt-2 block h-11 w-20 cursor-pointer rounded-md border border-border bg-surface"
            />
          </div>
          <Field id="profile-accent" label="Hex value" error={fieldErrors?.accent_color}>
            <Input
              name="accent_color"
              type="text"
              inputMode="text"
              placeholder="#0e7c5b"
              value={draft.fields.accent_color}
              onChange={(e) =>
                dispatch({ type: "setField", field: "accent_color", value: e.target.value })
              }
              invalid={Boolean(fieldErrors?.accent_color)}
            />
          </Field>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text">Section styles</h3>
          {galleryRow ? (
            <div className="mt-2">
              <SectionPresetBar
                typeLabel="Gallery"
                presets={galleryPresets}
                pending={false}
                onApply={(_presetId, presetSettings) =>
                  dispatch({
                    type: "setSectionSettings",
                    id: galleryRow.id,
                    settings: { ...galleryRow.settings, ...presetSettings },
                  })
                }
              />
            </div>
          ) : null}
          {menuRow ? (
            <div className="mt-2">
              <SectionPresetBar
                typeLabel="Menu"
                presets={menuPresets}
                pending={false}
                onApply={(_presetId, presetSettings) =>
                  dispatch({
                    type: "setSectionSettings",
                    id: menuRow.id,
                    settings: { ...menuRow.settings, ...presetSettings },
                  })
                }
              />
            </div>
          ) : null}
          {!galleryRow && !menuRow ? (
            <p className="mt-2 text-sm text-muted">
              Gallery and menu styles appear here once those sections are added.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
