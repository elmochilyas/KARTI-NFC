"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { OnboardingStep } from "@/features/profiles/completion";

function readDismissed(profileId: string): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    return window.localStorage.getItem(`karti-onboarding-${profileId}`) === "done";
  } catch {
    return false;
  }
}

/**
 * Post-creation guide (Phase 33): identity → contact → sections → publish.
 * Rendered for DRAFT profiles until dismissed (dismissal persists per
 * browser via localStorage — no new tables). Steps derive from the shared
 * completion engine, so the checklist agrees with the progress bar.
 */
export function OnboardingChecklist({
  profileId,
  steps,
}: {
  profileId: string;
  steps: OnboardingStep[];
}) {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(profileId));
  if (dismissed || steps.every((s) => s.done)) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(`karti-onboarding-${profileId}`, "done");
    } catch {
      // Non-persistent fallback: hide for this session render only.
    }
    setDismissed(true);
  }

  return (
    <section
      aria-label="Getting started"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Get your profile live</h2>
          <p className="mt-1 text-sm text-muted">Four steps from draft to published.</p>
        </div>
        <Button type="button" variant="secondary" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
      <ol className="mt-4 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                step.done ? "bg-[var(--karti-accent,#0e7c5b)] text-white" : "bg-surface-muted text-muted"
              }`}
            >
              {step.done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">
                <span className="mr-1.5 text-muted">{i + 1}.</span>
                {step.label}
                <span className="sr-only">{step.done ? " (done)" : " (todo)"}</span>
              </p>
              <p className="text-[13px] text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
