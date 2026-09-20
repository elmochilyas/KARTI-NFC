import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ProfileStepperFooter } from "./ProfileStepperFooter";

function footerHtml(props: {
  step: number;
  totalSteps?: number;
  stepLabel?: string;
  nextStepLabel?: string | null;
  saveLabel?: string;
  saving?: boolean;
}): string {
  return renderToStaticMarkup(
    createElement(ProfileStepperFooter, {
      step: props.step,
      totalSteps: props.totalSteps ?? 5,
      stepLabel: props.stepLabel ?? "Links",
      nextStepLabel: props.nextStepLabel === undefined ? "Appearance" : props.nextStepLabel,
      saveLabel: props.saveLabel ?? "Save draft",
      saving: props.saving ?? false,
      onPrevious: vi.fn(),
      onNext: vi.fn(),
    }),
  );
}

describe("ProfileStepperFooter", () => {
  it("shows step context with the current label", () => {
    const html = footerHtml({ step: 2 });
    expect(html).toContain("Step 3 of 5");
    expect(html).toContain("Links");
  });

  it("uses Previous / Next step / Save draft labels on middle steps", () => {
    const html = footerHtml({ step: 2 });
    expect(html).toContain("Previous");
    expect(html).toContain("Next step");
    expect(html).toContain("Save draft");
    expect(html).toContain('aria-label="Go to next step: Appearance"');
  });

  it("disables Previous on the first step", () => {
    const html = footerHtml({ step: 0, stepLabel: "Identity", nextStepLabel: "Contact" });
    expect(html).toContain('aria-label="Go to previous step"');
    // Previous is the only nav button disabled here; Next must stay enabled.
    expect(html).toContain("disabled");
    expect(html).toContain('aria-label="Go to next step: Contact"');
  });

  it("hides Next and promotes Save to primary on the last step", () => {
    const html = footerHtml({ step: 4, stepLabel: "Review", nextStepLabel: null });
    expect(html).not.toContain("Next step");
    expect(html).toContain("Save draft");
    expect(html).toContain("Step 5 of 5");
  });

  it("keeps Create profile wording for new profiles", () => {
    const html = footerHtml({
      step: 0,
      stepLabel: "Identity",
      nextStepLabel: "Contact",
      saveLabel: "Create profile",
    });
    expect(html).toContain("Create profile");
  });

  it("disables navigation and shows Saving… while saving", () => {
    const html = footerHtml({ step: 2, saving: true });
    expect(html).toContain("Saving…");
    expect(html).toContain('aria-busy="true"');
    // Previous + Next disabled, submit busy: every button carries disabled.
    const disabledCount = (html.match(/disabled=""/g) ?? []).length;
    expect(disabledCount).toBe(3);
  });

  it("is sticky and safe-area aware", () => {
    const html = footerHtml({ step: 2 });
    expect(html).toContain("sticky");
    expect(html).toContain("env(safe-area-inset-bottom)");
  });
});
