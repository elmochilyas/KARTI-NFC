import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ProfileStepperFooterProps = {
  /** Zero-based index of the current step. */
  step: number;
  /** Total number of steps. */
  totalSteps: number;
  /** Label of the current step (e.g. "Links"). */
  stepLabel: string;
  /** Label of the next step, or null on the last step. */
  nextStepLabel: string | null;
  /** Persist-action label: "Save draft" (existing) or "Create profile" (new). */
  saveLabel: string;
  /** True while the profile save action is running. */
  saving: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * Sticky mobile-first stepper footer for the profile editor.
 *
 * Hierarchy: primary Next (accent, thumb-side) → secondary Previous →
 * tertiary Save draft (subtle outline, full-width row). On the last step
 * the persist action takes over as the primary. Rendered inside the save
 * form so the persist button stays `type="submit"`.
 */
export function ProfileStepperFooter({
  step,
  totalSteps,
  stepLabel,
  nextStepLabel,
  saveLabel,
  saving,
  onPrevious,
  onNext,
}: ProfileStepperFooterProps) {
  const isFirst = step === 0;
  const isLast = nextStepLabel === null;
  const persistLabel = saving ? "Saving…" : saveLabel;

  return (
    <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-[0_8px_24px_rgb(17_20_24/0.12)] md:bottom-6">
      <div className="flex items-center px-1">
        <p className="min-w-0 truncate text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-text">
            Step {step + 1} of {totalSteps}
          </span>
          <span aria-hidden="true"> · </span>
          <span>{stepLabel}</span>
          {saving ? " · Saving…" : ""}
        </p>
      </div>
      <div aria-hidden="true" className="flex gap-1 px-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={isFirst || saving}
          onClick={onPrevious}
          aria-label="Go to previous step"
          className="shrink-0"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Previous
        </Button>
        {isLast ? (
          <Button type="submit" size="lg" loading={saving} className="flex-1">
            {persistLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={saving}
            onClick={onNext}
            aria-label={`Go to next step: ${nextStepLabel}`}
            className="flex-1"
          >
            Next step
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isLast ? null : (
        <Button
          type="submit"
          variant="ghost"
          loading={saving}
          className="w-full border border-border"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {persistLabel}
        </Button>
      )}
    </div>
  );
}
