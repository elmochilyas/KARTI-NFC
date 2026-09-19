"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PhysicalCardPanel } from "@/features/cards/components/PhysicalCardPanel";
import {
  configureNfcAction,
  type ConfigureActionState,
} from "@/app/dashboard/clients/[id]/nfc/actions";

export type DestinationSuggestion = {
  preset: string;
  label: string;
  url: string;
};

const PRESETS = [
  {
    value: "profile",
    label: "Karti Profile",
    hint: "The client's public profile",
    savesAs: "Saves as: Karti profile",
  },
  {
    value: "google_review",
    label: "Google Reviews",
    hint: "Review link",
    savesAs: "Saves as: External link",
  },
  {
    value: "instagram",
    label: "Instagram",
    hint: "Profile URL",
    savesAs: "Saves as: External link",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    hint: "wa.me link or number",
    savesAs: "Saves as: External link",
  },
  { value: "website", label: "Website", hint: "Business site", savesAs: "Saves as: External link" },
  {
    value: "custom",
    label: "Custom Link",
    hint: "Any https URL",
    savesAs: "Saves as: External link",
  },
] as const;

type PresetValue = (typeof PRESETS)[number]["value"];

const INITIAL_STATE: ConfigureActionState = { ok: false, message: "" };

/** Single-page NFC configuration: preset → URL → confirm → success. */
export function NfcConfigureForm({
  clientId,
  clientName,
  profileAvailable,
  profileActive,
  website,
  suggestions,
}: {
  clientId: string;
  clientName: string;
  profileAvailable: boolean;
  profileActive: boolean;
  website: string | null;
  suggestions: DestinationSuggestion[];
}) {
  const [state, formAction, pending] = useActionState(
    configureNfcAction.bind(null, clientId),
    INITIAL_STATE,
  );
  const [preset, setPreset] = useState<PresetValue>(
    (state.values?.kind as PresetValue) || "profile",
  );
  const [url, setUrl] = useState(state.values?.url ?? website ?? "");

  const uniqueSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      const key = s.url.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [suggestions]);

  if (state.ok && state.permanentUrl) {
    return (
      <section
        aria-label="NFC configuration ready"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Card ready ✓</h2>
        <p className="mt-1 text-sm text-muted">
          {state.message} Same card, same URL — reconfiguring never changes the physical tag.
        </p>
        <div className="mt-4">
          {state.shortCode && state.cardNumber ? (
            <PhysicalCardPanel
              permanentUrl={state.permanentUrl}
              cardNumber={state.cardNumber}
              shortCode={state.shortCode}
            />
          ) : (
            <p className="break-all font-mono text-sm text-text">{state.permanentUrl}</p>
          )}
        </div>
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
        >
          Back to {clientName}
        </Link>
      </section>
    );
  }

  const needsUrl = preset !== "profile";
  const profileBlocked = !profileAvailable || !profileActive;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.message ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <section
        aria-label="Destination"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Step 1 — What should this card open?</h2>
        <p className="mt-1 text-sm text-muted">
          Presets are shortcuts. Everything saves as either a Karti profile or an external link.
        </p>
        <div role="radiogroup" aria-label="Destination" className="mt-4 flex flex-col gap-2">
          {PRESETS.map((option) => {
            const disabled = option.value === "profile" && profileBlocked;
            const selected = preset === option.value;
            return (
              <label
                key={option.value}
                className={`radio-card flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                  disabled
                    ? "cursor-not-allowed border-border opacity-60"
                    : selected
                      ? "border-accent"
                      : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="destination_preset"
                  value={option.value}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    setPreset(option.value);
                    const suggestion = suggestions.find((s) => s.preset === option.value);
                    if (suggestion) setUrl(suggestion.url);
                    else if (option.value === "website" && website) setUrl(website);
                  }}
                  className="mt-1 h-4 w-4 accent-[#0e7c5b]"
                />
                <span>
                  <span className="block text-sm font-medium text-text">{option.label}</span>
                  <span className="block text-sm text-muted">{option.hint}</span>
                  <span className="mt-0.5 block text-sm font-medium text-accent">
                    {option.savesAs}
                  </span>
                  {option.value === "profile" && !profileAvailable ? (
                    <span className="mt-1 block text-sm">
                      No profile yet.{" "}
                      <Link
                        href={`/dashboard/clients/${clientId}/profile/new`}
                        className="font-medium text-accent hover:underline"
                      >
                        Create Profile
                      </Link>
                    </span>
                  ) : null}
                  {option.value === "profile" && profileAvailable && !profileActive ? (
                    <span className="mt-1 block text-sm">
                      Profile is not active.{" "}
                      <Link
                        href={`/dashboard/clients/${clientId}/profile`}
                        className="font-medium text-accent hover:underline"
                      >
                        Open Profile
                      </Link>
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {/* Persisted destination kind: PROFILE or EXTERNAL_URL (never preset names). */}
        <input
          type="hidden"
          name="destination_kind"
          value={preset === "profile" ? "PROFILE" : "EXTERNAL_URL"}
        />
      </section>

      {needsUrl ? (
        <section
          aria-label="Link"
          className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <h2 className="text-base font-semibold text-text">Step 2 — Confirm the link</h2>
          <p className="mt-1 text-sm text-muted">
            Must be a safe http(s) URL. Unsafe schemes are rejected.
          </p>
          {uniqueSuggestions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {uniqueSuggestions.map((s) => {
                let host = s.url;
                try {
                  host = new URL(s.url).hostname;
                } catch {
                  host = s.url;
                }
                return (
                  <button
                    key={`${s.preset}-${s.url}`}
                    type="button"
                    onClick={() => {
                      setUrl(s.url);
                      setPreset(s.preset as PresetValue);
                    }}
                    title={s.url}
                    className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-muted hover:text-text"
                  >
                    Use {s.label} — {host}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="mt-3">
            <Field id="nfc-url" label="Destination URL" required>
              <Input
                name="url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </Field>
          </div>
        </section>
      ) : null}

      <Button type="submit" loading={pending}>
        {pending ? "Configuring…" : "Confirm & activate card"}
      </Button>
    </form>
  );
}
