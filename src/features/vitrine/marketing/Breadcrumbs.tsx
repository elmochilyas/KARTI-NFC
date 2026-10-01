import Link from "next/link";
import type { BreadcrumbItem } from "../seo";

/**
 * Visible breadcrumb trail (pages also emit matching BreadcrumbList
 * JSON-LD). Last item is current page text, never a link.
 */
export function Breadcrumbs({ trail }: { trail: BreadcrumbItem[] }) {
  if (trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="py-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted">
        {trail.slice(0, -1).map((item) => (
          <li key={item.url} className="flex items-center gap-1.5">
            <Link
              href={item.url}
              className="rounded px-1 py-0.5 underline-offset-4 hover:text-text hover:underline"
            >
              {item.label}
            </Link>
            <span aria-hidden="true" className="karti-flip-rtl text-border">
              /
            </span>
          </li>
        ))}
        <li aria-current="page" className="max-w-full truncate px-1 py-0.5 font-medium text-text">
          {trail[trail.length - 1].label}
        </li>
      </ol>
    </nav>
  );
}

export function homeCrumb(homeUrl: string, homeLabel: string): BreadcrumbItem {
  return { label: homeLabel, url: homeUrl };
}
