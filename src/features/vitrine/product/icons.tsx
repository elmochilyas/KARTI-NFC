/**
 * PDP icon set (server-safe, zero client JS, zero new dependencies).
 *
 * Hand-drawn duotone line marks in the Karti voice: ink strokes
 * (`currentColor`) with restrained accent/gold fills. All marks are
 * decorative (`aria-hidden`) — text never depends on an icon alone.
 * Directional marks must be wrapped by the caller in a `karti-flip-rtl`
 * span; non-directional marks need no RTL handling. Brand marks reuse
 * `react-icons/si` with official colors, matching the public-profile
 * tile convention.
 */

import type { ReactNode } from "react";

function Base({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

/** Profile-family tap: person + signal waves. */
export function IdentityTapMark({ className }: { className?: string }) {
  return (
    <Base className={className ?? "h-16 w-16"}>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M3.8 19.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="M17.5 9.4a3.4 3.4 0 0 1 0 4.6" className="text-accent" />
      <path d="M19.8 7.4a6.4 6.4 0 0 1 0 8.6" className="text-accent" />
    </Base>
  );
}

/** Direct-family tap: bolt + signal waves (opens a destination, no profile). */
export function DirectTapMark({ className }: { className?: string }) {
  return (
    <Base className={className ?? "h-16 w-16"}>
      <path d="M12.5 2.5 5.5 13.5h4.8l-1 8 7-11h-4.8z" />
      <path d="M19 9.4a3.4 3.4 0 0 1 0 4.6" className="text-accent" />
    </Base>
  );
}

/** Order CTA bag with accent clasp. */
export function OrderBagIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M5.5 8h13l-1 12.5h-11z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      <circle cx="12" cy="13.5" r="1.3" fill="currentColor" stroke="none" className="text-accent" />
    </Base>
  );
}

/** In-stock package. */
export function PackageIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </Base>
  );
}

/** Pre-order clock. */
export function PreorderClockIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.5 1.5" className="text-accent" />
      <path d="M9.5 2.5h5" />
    </Base>
  );
}

/** Out-of-stock: blocked circle. */
export function BlockedCircleIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.2 6.2l11.6 11.6" />
    </Base>
  );
}

/** Person (audience chips, profile note, contact-family cards). */
export function UserRoundIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Base>
  );
}

/** Business storefront. */
export function StorefrontIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 9.5 5.2 5h13.6L20 9.5" />
      <path d="M4 9.5V19h16V9.5" />
      <path d="M10 19v-5h4v5" className="text-accent" />
    </Base>
  );
}

/** Custom-link chain. */
export function LinkChainIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M10 14a4 4 0 0 0 6 0l2.5-2.5a4 4 0 0 0-5.6-5.6L11.5 7.3" />
      <path d="M14 10a4 4 0 0 0-6 0l-2.5 2.5a4 4 0 0 0 5.6 5.6l1.4-1.4" />
    </Base>
  );
}

/** Customization sliders. */
export function SlidersIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 7h9M17.5 7H20M4 17h4M12.5 17H20" />
      <circle cx="15" cy="7" r="2" className="text-accent" />
      <circle cx="10" cy="17" r="2" className="text-accent" />
      <path d="M4 12h16" />
      <circle cx="15.5" cy="12" r="2" />
    </Base>
  );
}

/** Demo spark for example cards. */
export function DemoSparkIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M12 4l1.7 4.6L18.5 10l-4.8 1.4L12 16l-1.7-4.6L5.5 10l4.8-1.4z" />
      <path
        d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"
        className="text-accent"
      />
    </Base>
  );
}

/** Empty-gallery image-plus mark. */
export function ImagePlusMark({ className }: { className?: string }) {
  return (
    <Base className={className ?? "h-16 w-16"}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5 10 12l3.5 3.5 2.5-2.5 3.5 3.5" />
      <path d="M18 3.5v4M16 5.5h4" className="text-accent" />
    </Base>
  );
}

/** Check seal for benefits/included rows. */
export function CheckSealIcon({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2 11 14.7l4.5-5.4" className="text-accent" />
    </Base>
  );
}

/** Directional arrow — caller wraps in a `karti-flip-rtl` span for RTL. */
export function ArrowGlyph({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 12h15" />
      <path d="M13.5 6.5 19 12l-5.5 5.5" />
    </Base>
  );
}
