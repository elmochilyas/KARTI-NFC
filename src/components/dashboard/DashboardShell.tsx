"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CreditCard, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", exact: true, Icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", exact: false, Icon: Users },
  { href: "/dashboard/cards", label: "Cards", exact: false, Icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", exact: false, Icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium text-muted transition-colors hover:bg-surface-muted hover:text-text ${
          compact ? "min-h-11 min-w-11 px-3 text-sm" : "min-h-10 w-full px-3 text-sm"
        }`}
        aria-label="Sign out"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {compact ? null : <span>Sign out</span>}
      </button>
    </form>
  );
}

/**
 * Responsive operational shell: sidebar on desktop, bottom nav on mobile.
 * Pure presentational — auth is enforced by src/proxy.ts + the dashboard layout.
 */
export function DashboardShell({ email, children }: { email?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background text-text md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-surface md:flex md:flex-col">
        <div className="px-5 pb-2 pt-6">
          <p className="text-xl font-bold tracking-tight">Karti</p>
          {email ? <p className="mt-1 truncate text-xs text-muted">{email}</p> : null}
        </div>
        <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface-muted text-text"
                    : "text-muted hover:bg-surface-muted/60 hover:text-text"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-accent"
                  />
                ) : null}
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <p className="text-lg font-bold tracking-tight">Karti</p>
          <LogoutButton compact />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
        <nav
          aria-label="Dashboard"
          className="fixed inset-x-0 bottom-0 border-t border-border bg-surface md:hidden"
        >
          <ul className="grid grid-cols-4">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.Icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${
                      active ? "text-text" : "text-muted"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {item.label}
                    {active ? (
                      <span aria-hidden="true" className="h-1 w-6 rounded-full bg-accent" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
