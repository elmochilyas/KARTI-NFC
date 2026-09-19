import type { ReactNode } from "react";

export function Section({
  title,
  description,
  actions,
  children,
  labelledBy,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      aria-label={labelledBy ?? title}
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
