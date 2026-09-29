/**
 * FAQ accordion built on native <details> — zero client JS, keyboard
 * operable by construction, screen-reader announced via group names.
 */
export function FaqList({ items, idPrefix }: { items: { q: string; a: string }[]; idPrefix: string }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <details
          key={`${idPrefix}-${index}`}
          className="group rounded-xl border border-border bg-surface px-4 py-3"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-start text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden="true" className="shrink-0 text-muted group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-1 pb-1 text-sm leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
