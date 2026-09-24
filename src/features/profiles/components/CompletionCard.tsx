import type { CompletionResult } from "@/features/profiles/completion";

/**
 * Builder progress card (Phase 33): server-rendered from the shared
 * completion calculation. Lists what's missing without duplicating the
 * onboarding checklist copy.
 */
export function CompletionCard({ completion }: { completion: CompletionResult }) {
  const missing = [...completion.required, ...completion.recommended].filter((i) => !i.done);
  const levelCopy =
    completion.level === "complete"
      ? "Profile complete"
      : completion.level === "almost-there"
        ? "Almost there"
        : "Getting started";
  return (
    <section
      aria-label="Profile completion"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-text">{levelCopy}</h2>
        <span className="text-sm font-bold text-text" aria-live="polite">
          {completion.percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={completion.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${completion.percent}%`,
            backgroundColor: "var(--karti-accent, #0e7c5b)",
          }}
        />
      </div>
      {missing.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {missing.map((item) => (
            <li key={item.id} className="text-sm text-muted">
              <span className="font-semibold text-text">Next:</span> {item.label}
              {item.required ? "" : " (recommended)"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Everything is filled in. Publish when ready.</p>
      )}
    </section>
  );
}
