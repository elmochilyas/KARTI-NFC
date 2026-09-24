"use client";

import { getCatalogEntry, type SectionSettingsProps } from "@/features/profiles/sectionCatalog";

/**
 * Phase 27 dynamic settings loader: resolves the editor component for a
 * section type from the registry and renders it. Returns null when the
 * type has no editor yet — callers show their placeholder instead.
 */
export function SectionSettingsRenderer({
  type,
  settings,
  pending,
  onSave,
  onChange,
  autoFocus,
  context,
}: {
  type: string;
} & SectionSettingsProps) {
  const entry = getCatalogEntry(type);
  const Editor = entry?.settingsComponent ?? null;
  if (!Editor) return null;
  return (
    <Editor
      settings={settings}
      pending={pending}
      onSave={onSave}
      onChange={onChange}
      autoFocus={autoFocus}
      context={context}
    />
  );
}
