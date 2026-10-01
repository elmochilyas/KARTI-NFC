/**
 * FAQ accordion built on native <details> — zero client JS, keyboard
 * operable by construction, screen-reader announced via group names.
 */
export function FaqList({
  items,
  idPrefix,
}: {
  items: { q: string; a: string }[];
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <details
          key={`${idPrefix}-${index}`}
          className="group rounded-2xl border border-border bg-surface px-5 py-2 shadow-card transition-colors open:border-accent/30 open:shadow-[var(--shadow-lift)]"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-start text-[15px] font-semibold text-text [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-medium text-muted transition-transform group-open:rotate-45 group-open:bg-accent-soft group-open:text-accent-strong"
            >
              +
            </span>
          </summary>
          <p className="pb-4 text-[15px] leading-relaxed text-pretty text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
