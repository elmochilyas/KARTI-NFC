import Link from "next/link";
import type { OrdersSummary } from "../types";

const TILES: Array<{
  label: string;
  href: string;
  key: keyof OrdersSummary;
  description: string;
}> = [
  {
    label: "New",
    href: "/dashboard/orders?view=new",
    key: "newCount",
    description: "Awaiting first contact",
  },
  {
    label: "Needs action",
    href: "/dashboard/orders?view=needs-action",
    key: "needsActionCount",
    description: "Operator attention required",
  },
  {
    label: "In progress",
    href: "/dashboard/orders?view=in-progress",
    key: "inProgressCount",
    description: "Active fulfillment work",
  },
  {
    label: "Ready",
    href: "/dashboard/orders?view=ready",
    key: "readyCount",
    description: "Ready to ship or deliver",
  },
];

export function SummaryTiles({ summary }: { summary: OrdersSummary }) {
  return (
    <section aria-label="Order summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILES.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="flex min-h-11 flex-col justify-center rounded-xl border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:border-muted"
        >
          <span className="text-2xl font-bold tabular-nums">{summary[tile.key]}</span>
          <span className="text-sm font-semibold">{tile.label}</span>
          <span className="text-xs text-muted">{tile.description}</span>
        </Link>
      ))}
    </section>
  );
}
