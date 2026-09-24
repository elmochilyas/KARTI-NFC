import { locationQuery } from "./sectionSettings";
import { isFoundationSectionType } from "./sectionCatalog";

/**
 * Phase 33 profile completion engine. Pure — no DB, no auth — so the
 * dashboard, onboarding checklist, and tests share one calculation.
 *
 * Required (20 pts each, 60 total): display name, profile image
 * (avatar or cover), one contact action (call/WhatsApp/email/website).
 * Recommended (10 pts each, 40 total): description, an enabled link, a
 * configured location section, a gallery with at least one photo.
 */

export type CompletionProfile = {
  display_name: string;
  avatar_path: string | null;
  cover_path: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  bio: string | null;
  status: string;
};

export type CompletionLink = {
  enabled: boolean;
};

export type CompletionSection = {
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
};

export type CompletionItem = {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
};

export type CompletionResult = {
  percent: number;
  level: "getting-started" | "almost-there" | "complete";
  required: CompletionItem[];
  recommended: CompletionItem[];
};

const nonEmpty = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim() !== "";

function hasContactAction(profile: CompletionProfile): boolean {
  return (
    nonEmpty(profile.phone) ||
    nonEmpty(profile.whatsapp) ||
    nonEmpty(profile.email) ||
    nonEmpty(profile.website)
  );
}

function hasLocation(sections: CompletionSection[]): boolean {
  return sections.some((s) => {
    if (s.type !== "location" || s.enabled === false) return false;
    return (
      locationQuery({
        address: (s.settings as { address?: unknown }).address,
        latitude: (s.settings as { latitude?: unknown }).latitude,
        longitude: (s.settings as { longitude?: unknown }).longitude,
      }) !== null
    );
  });
}

function hasGalleryPhotos(sections: CompletionSection[]): boolean {
  return sections.some((s) => {
    if (s.type !== "gallery" || s.enabled === false) return false;
    const images = (s.settings as { images?: unknown }).images;
    return (
      Array.isArray(images) &&
      images.some(
        (g) =>
          typeof g === "object" &&
          g !== null &&
          typeof (g as { image?: unknown }).image === "string" &&
          (g as { image: string }).image.trim() !== "",
      )
    );
  });
}

export function computeCompletion(
  profile: CompletionProfile,
  links: CompletionLink[],
  sections: CompletionSection[],
): CompletionResult {
  const required: CompletionItem[] = [
    { id: "name", label: "Display name", done: nonEmpty(profile.display_name), required: true },
    {
      id: "image",
      label: "Profile photo or cover",
      done: nonEmpty(profile.avatar_path) || nonEmpty(profile.cover_path),
      required: true,
    },
    { id: "action", label: "A contact action", done: hasContactAction(profile), required: true },
  ];
  const recommended: CompletionItem[] = [
    { id: "bio", label: "Short description", done: nonEmpty(profile.bio), required: false },
    {
      id: "links",
      label: "At least one link",
      done: links.some((l) => l.enabled),
      required: false,
    },
    { id: "location", label: "Location block", done: hasLocation(sections), required: false },
    { id: "gallery", label: "Gallery photos", done: hasGalleryPhotos(sections), required: false },
  ];
  const percent = Math.min(
    100,
    required.filter((i) => i.done).length * 20 + recommended.filter((i) => i.done).length * 10,
  );
  const level = percent >= 100 ? "complete" : percent >= 60 ? "almost-there" : "getting-started";
  return { percent, level, required, recommended };
}

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
};

/**
 * Post-creation guide: identity → contact → sections → publish. Derived
 * from the same completion data so the checklist can never disagree with
 * the progress bar.
 */
export function onboardingSteps(
  profile: CompletionProfile,
  links: CompletionLink[],
  sections: CompletionSection[],
): OnboardingStep[] {
  const completion = computeCompletion(profile, links, sections);
  const byId = new Map(
    [...completion.required, ...completion.recommended].map((i) => [i.id, i.done]),
  );
  const hasBeyondFoundation = sections.some((s) => s.enabled && !isFoundationSectionType(s.type));
  return [
    {
      id: "identity",
      label: "Add your identity",
      description: "Display name and a profile photo or cover.",
      done: (byId.get("name") ?? false) && (byId.get("image") ?? false),
    },
    {
      id: "contact",
      label: "Add a contact action",
      description: "Phone, WhatsApp, email or website.",
      done: byId.get("action") ?? false,
    },
    {
      id: "sections",
      label: "Configure your sections",
      description: "Add a link or enable a content block.",
      done: (byId.get("links") ?? false) || hasBeyondFoundation,
    },
    {
      id: "publish",
      label: "Publish your profile",
      description: "Activate the profile to make it public.",
      done: profile.status === "ACTIVE",
    },
  ];
}
