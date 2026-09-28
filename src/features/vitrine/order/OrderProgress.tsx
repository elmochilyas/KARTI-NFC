/**
 * Textual 4-step progress indicator (never color-only).
 */

import type { VitrineDict } from "../i18n";

export function OrderProgress({ dict, step }: { dict: VitrineDict; step: number }) {
  const steps = [
    dict.order.steps.card,
    dict.order.steps.details,
    dict.order.steps.delivery,
    dict.order.steps.review,
  ];
  return (
    <nav aria-label={`${dict.order.stepOf} ${step + 1} / 4`}>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {steps.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "todo";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-center gap-2 text-sm"
            >
              <span
                aria-hidden="true"
                className={
                  state === "current"
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-contrast"
                    : state === "done"
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-success-muted text-xs font-bold text-accent"
                      : "flex h-6 w-6 items-center justify-center rounded-full bg-neutral-muted text-xs font-bold text-muted"
                }
              >
                {state === "done" ? "✓" : index + 1}
              </span>
              <span className={state === "current" ? "font-bold" : "text-muted"}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-muted">
        {dict.order.stepOf} {step + 1} / 4 — {steps[step]}
      </p>
    </nav>
  );
}
