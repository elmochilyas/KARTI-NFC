import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { OnboardingStep } from "@/features/profiles/completion";

const STEPS: OnboardingStep[] = [
  { id: "identity", label: "Add your identity", description: "Name and photo.", done: true },
  { id: "contact", label: "Add a contact action", description: "Phone or mail.", done: false },
  { id: "sections", label: "Configure your sections", description: "Links.", done: false },
  { id: "publish", label: "Publish your profile", description: "Activate.", done: false },
];

describe("OnboardingChecklist", () => {
  it("renders todo and done states with accessible labels", () => {
    const html = renderToStaticMarkup(
      createElement(OnboardingChecklist, { profileId: "client-1", steps: STEPS }),
    );
    expect(html).toContain("Get your profile live");
    expect(html).toContain("Add a contact action");
    expect(html).toContain("(done)");
    expect(html).toContain("(todo)");
    expect(html).toContain("Dismiss");
  });

  it("renders nothing when every step is done", () => {
    const html = renderToStaticMarkup(
      createElement(OnboardingChecklist, {
        profileId: "client-1",
        steps: STEPS.map((s) => ({ ...s, done: true })),
      }),
    );
    expect(html).toBe("");
  });
});
