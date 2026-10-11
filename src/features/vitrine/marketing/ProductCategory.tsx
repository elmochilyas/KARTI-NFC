/**
 * The five main customer-facing product categories, shared by the
 * desktop mega-panel, the mobile menu, and the home product rail.
 *
 * Each category maps to one representative product page. Labels are
 * localized via `dict.marketingHome.categories`; category keys stay
 * locale-invariant.
 */

export const PRODUCT_CATEGORIES = [
  { key: "personal", product: "PERSONAL_CARD" },
  { key: "business", product: "BUSINESS_CARD" },
  { key: "googleReview", product: "GOOGLE_REVIEW_CARD" },
  { key: "career", product: "CAREER_CARD" },
  { key: "customLink", product: "CUSTOM_LINK_CARD" },
] as const;

export type ProductCategoryKey = (typeof PRODUCT_CATEGORIES)[number]["key"];
export type ProductCategoryDef = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Product media slot. No static NFC photography exists yet (`public/` is
 * empty), so this renders a reserved warm-neutral 4:3 frame with a subtle
 * contact-card silhouette instead of an invented image path. Decorative
 * only (`aria-hidden`).
 *
 * Attach point for real photography (4:3 WebP):
 *   public/images/nfc/{personal,business,google-reviews,student,social}
 * Replace the inner silhouette with <Image …/> when the assets land.
 */
export function CategoryMedia({ size }: { size: "thumb" | "card" }) {
  if (size === "thumb") {
    return (
      <div
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-muted"
      >
        <span className="flex h-8 w-6 rotate-[-8deg] flex-col items-start justify-start rounded-[5px] border border-ink/10 bg-background p-1 shadow-[var(--shadow-card)]">
          <span className="h-1.5 w-2.5 rounded-[2px] bg-gold/70" />
        </span>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-surface-muted to-surface-muted/40"
    >
      <span className="w-[56%] rotate-[-6deg] rounded-lg border border-ink/10 bg-background p-3.5 shadow-[var(--shadow-card)]">
        <span className="block h-2.5 w-4 rounded-[3px] bg-gold/80" />
        <span className="mt-3 block h-1 w-3/4 rounded-full bg-ink/15" />
        <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-ink/10" />
      </span>
    </div>
  );
}
