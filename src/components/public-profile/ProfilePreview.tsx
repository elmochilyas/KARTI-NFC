import type { CSSProperties, ReactNode } from "react";
import { validateSafeExternalUrl } from "@/domain/urls";
import type { ProfileTheme } from "@/features/profiles/schema";

/**
 * Reusable profile-visual components. Used by the dashboard live preview
 * now; Phase 5 reuses them for the anonymous public profile page.
 * Pure presentational — no data fetching, no auth, no dashboard imports.
 */

export type PreviewContact = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
};

export type PreviewLink = {
  id: string;
  type: string;
  label: string;
  url: string;
};

/**
 * Contact href builders. Each returns null when the stored value is not a
 * safe action target — callers omit the tile/row instead of rendering a
 * hostile href. Stored data is never trusted: direct DB writes bypass the
 * dashboard Zod validation, so render-time gating is the last line of
 * defense (specs/SECURITY.md).
 */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/[\s().-]/g, "");
  if (!/^\+?\d{4,32}$/.test(digits)) return null;
  return `tel:${digits}`;
}

export function whatsappHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    // Stored wa.me links pass through the full external-URL validator.
    return validateSafeExternalUrl(trimmed);
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 20) return null;
  return `https://wa.me/${digits}`;
}

export function mailHref(email: string): string | null {
  const trimmed = email.trim();
  if (/[\u0000-\u001f\u007f"(),;:\\[\]<>]/.test(trimmed)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

/** Derive a readable foreground color for an accent background (WCAG-ish). */
export function foregroundOnAccent(hex: string | null): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111418" : "#ffffff";
}

/* ------------------------------------------------------------------ */
/* Icons — one coherent feather-style stroke set (decorative only;    */
/* every control keeps its visible text label + accessible name).     */
/* ------------------------------------------------------------------ */

function BaseIcon({
  className = "h-4 w-4",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconPhone({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </BaseIcon>
  );
}

export function IconChat({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </BaseIcon>
  );
}

export function IconMail({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </BaseIcon>
  );
}

export function IconGlobe({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </BaseIcon>
  );
}

export function IconPin({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </BaseIcon>
  );
}

export function IconDownload({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </BaseIcon>
  );
}

export function IconExternal({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </BaseIcon>
  );
}

export function IconLink({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </BaseIcon>
  );
}

export function IconChevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="m9 18 6-6-6-6" />
    </BaseIcon>
  );
}

export function IconShare({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </BaseIcon>
  );
}

export function IconWallet({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <BaseIcon className={className}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </BaseIcon>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function ProfileShell({
  theme,
  accent,
  children,
}: {
  theme: ProfileTheme;
  accent: string | null;
  children: ReactNode;
}) {
  const dark = theme === "dark";
  return (
    <div
      className={`mx-auto flex w-full max-w-[26rem] flex-col items-center gap-6 rounded-[1.75rem] border px-6 py-8 text-center ${
        dark
          ? "border-neutral-800 bg-neutral-900 text-neutral-50 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]"
          : "border-neutral-200/70 bg-white text-text shadow-[0_24px_60px_-24px_rgba(17,20,24,0.18)]"
      }`}
      style={{ "--karti-accent": accent ?? "#0e7c5b" } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Identity header                                                     */
/* ------------------------------------------------------------------ */

export function ProfileHeader({
  avatarUrl,
  coverUrl,
  displayName,
  subtitle,
  company,
  bio,
  dark,
}: {
  avatarUrl: string | null;
  coverUrl: string | null;
  displayName: string;
  subtitle: string | null;
  company: string | null;
  bio: string | null;
  dark: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          aria-hidden="true"
          className="h-28 w-full rounded-2xl object-cover"
        />
      ) : null}
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${displayName} profile photo`}
          className={`h-24 w-24 rounded-full object-cover shadow-md ring-4 ${
            dark ? "ring-neutral-900" : "ring-white"
          } ${coverUrl ? "-mt-12" : "mt-1"}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`mt-1 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-extrabold shadow-md ring-4 ${
            dark ? "bg-neutral-800 text-neutral-100 ring-neutral-900" : "ring-white"
          }`}
          style={
            dark
              ? undefined
              : {
                  backgroundColor: "color-mix(in srgb, var(--karti-accent) 14%, transparent)",
                  color: "var(--color-text)",
                }
          }
        >
          {displayName.trim().charAt(0).toUpperCase() || "•"}
        </div>
      )}
      <div className="mt-4 flex w-full flex-col items-center gap-1">
        <h2 className="text-[1.75rem] leading-[1.15] font-extrabold tracking-tight break-words">
          {displayName || "Your name"}
        </h2>
        <span
          aria-hidden="true"
          className="mt-1.5 h-1 w-10 rounded-full"
          style={{ backgroundColor: "var(--karti-accent)" }}
        />
        {subtitle ? (
          <p className={`mt-1.5 text-[0.95rem] font-semibold ${dark ? "text-neutral-200" : ""}`}>
            {subtitle}
          </p>
        ) : null}
        {company ? (
          <p className={`text-sm ${dark ? "text-neutral-400" : "text-muted"}`}>{company}</p>
        ) : null}
        {bio ? (
          <p
            className={`mt-1.5 max-w-[22rem] text-[0.95rem] leading-relaxed break-words ${
              dark ? "text-neutral-400" : "text-muted"
            }`}
          >
            {bio}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Primary CTA                                                         */
/* ------------------------------------------------------------------ */

/**
 * Inert wallet-card preview for the dashboard editor. Deliberately a
 * `<span>` tree, not the live island: the live button detects the
 * operator's device and links the wallet API, neither of which makes sense
 * inside the editor. Mirrors the public card copy at a glance.
 */
export function WalletCtaPreview({ dark }: { dark: boolean }) {
  return (
    <span className="block">
      <span
        className={`block px-1 text-xs font-bold tracking-[0.18em] uppercase ${
          dark ? "text-neutral-400" : "text-muted"
        }`}
      >
        Keep this card
      </span>
      <span
        className={`mt-2.5 inline-flex min-h-[68px] w-full items-center gap-3 rounded-[20px] px-4 py-3 ${
          dark ? "bg-neutral-800/40 text-neutral-100" : "bg-white text-text"
        } border ${dark ? "border-neutral-800" : "border-border"}`}
      >
        <IconWallet className="h-[23px] w-[23px] shrink-0" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[16px] leading-tight font-extrabold">Add to Wallet</span>
          <span
            className={`mt-0.5 block text-[13px] leading-snug font-medium ${
              dark ? "text-neutral-400" : "text-muted"
            }`}
          >
            Keep this digital card on your phone
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Inert Share preview for the dashboard editor. Deliberately a `<span>`,
 * not the live Share island: the live button shares `window.location.href`,
 * which inside the editor would be a dashboard URL, never the public page.
 * Reserved for future use; the public page uses the live island instead.
 */
export function ShareProfilePreview({ dark }: { dark: boolean }) {
  return (
    <span
      className={`inline-flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-[0.95rem] font-semibold ${
        dark
          ? "border-neutral-800 bg-neutral-800/40 text-neutral-100"
          : "border-border bg-white text-text"
      }`}
    >
      <IconShare className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate text-left">Share my profile</span>
      <IconChevron className={`h-4 w-4 shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`} />
    </span>
  );
}

/**
 * Reserved for future use — no longer rendered on the public profile or
 * the editor preview (Share Profile is the final CTA instead). The vCard
 * endpoint stays available. Kept exported so a future flow can reuse it
 * without rebuilding the visual.
 */
export function SaveContactButton({
  accent,
  mode = "preview",
  slug,
}: {
  accent: string | null;
  /** preview: inert visual (dashboard editor). public: real download link. */
  mode?: "preview" | "public";
  slug?: string;
}) {
  const className =
    "inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[0.95rem] font-semibold tracking-[0.01em] shadow-[0_12px_28px_-14px_var(--karti-accent)] transition hover:brightness-[1.07] active:scale-[0.99]";
  const style = {
    backgroundColor: accent ?? "#0e7c5b",
    color: foregroundOnAccent(accent),
  };
  if (mode === "public" && slug) {
    return (
      <a href={`/api/vcard/${slug}.vcf`} className={className} style={style}>
        <IconDownload className="h-[18px] w-[18px]" />
        Save Contact
      </a>
    );
  }
  return (
    <span className={className} style={style}>
      <IconDownload className="h-[18px] w-[18px]" />
      Save Contact
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Quick contact actions (pills)                                       */
/* ------------------------------------------------------------------ */

const pillClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98]";

function pillTheme(dark: boolean): string {
  return dark
    ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
    : "bg-surface-muted text-text hover:bg-border";
}

export function ContactActions({ contact, dark }: { contact: PreviewContact; dark: boolean }) {
  const items: { label: string; icon: ReactNode }[] = [];
  if (contact.phone) items.push({ label: "Call", icon: <IconPhone /> });
  if (contact.whatsapp) items.push({ label: "WhatsApp", icon: <IconChat /> });
  if (contact.email) items.push({ label: "Email", icon: <IconMail /> });
  if (contact.website) items.push({ label: "Website", icon: <IconGlobe /> });
  if (items.length === 0) return null;
  return (
    <nav aria-label="Contact actions" className="flex w-full flex-wrap justify-center gap-2">
      {items.map((item) => (
        <span key={item.label} className={`${pillClass} ${pillTheme(dark)}`}>
          {item.icon}
          {item.label}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Links (rows)                                                        */
/* ------------------------------------------------------------------ */

const rowClass =
  "group inline-flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-[0.95rem] font-semibold transition active:scale-[0.99]";

function rowTheme(dark: boolean): string {
  return dark
    ? "border-neutral-800 bg-neutral-800/40 text-neutral-100 hover:bg-neutral-800/80"
    : "border-border bg-white hover:bg-surface-muted";
}

export function ProfileLinksList({ links, dark }: { links: PreviewLink[]; dark: boolean }) {
  const visible = links.filter((link) => link.label.trim() !== "" && link.url.trim() !== "");
  if (visible.length === 0) return null;
  return (
    <nav aria-label="Profile links" className="flex w-full flex-col gap-2">
      {visible.map((link) => (
        <span key={link.id} className={`${rowClass} ${rowTheme(dark)}`}>
          <IconLink
            className={`h-[18px] w-[18px] shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
          />
          <span className="flex-1 truncate text-left">{link.label}</span>
          <IconChevron
            className={`h-4 w-4 shrink-0 transition group-active:translate-x-0.5 ${
              dark ? "text-neutral-500" : "text-muted"
            }`}
          />
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Location (grouped block)                                            */
/* ------------------------------------------------------------------ */

export function LocationBlock({
  address,
  mapsUrl,
  dark,
}: {
  address: string | null;
  mapsUrl: string | null;
  dark: boolean;
}) {
  if (!address && !mapsUrl) return null;
  return (
    <div
      className={`flex w-full gap-3 rounded-2xl px-4 py-3.5 text-left ${
        dark ? "bg-neutral-800/60" : "bg-surface-muted"
      }`}
    >
      <IconPin className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {address ? (
          <p className="text-sm leading-relaxed font-medium break-words">{address}</p>
        ) : null}
        {mapsUrl ? (
          <p className="mt-2.5">
            <span
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold ${
                dark
                  ? "border-neutral-700 bg-neutral-900 text-neutral-100"
                  : "border-border bg-white text-text"
              }`}
            >
              Open in Maps
              <IconExternal className="h-3.5 w-3.5" />
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

export function KartiAttribution({ dark }: { dark: boolean }) {
  return (
    <div className={`w-full border-t pt-4 ${dark ? "border-neutral-800" : "border-border"}`}>
      <p className={`text-xs ${dark ? "text-neutral-500" : "text-muted"}`}>
        Powered by <span className="font-semibold">Karti</span>
      </p>
    </div>
  );
}
