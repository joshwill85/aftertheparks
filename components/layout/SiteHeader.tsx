"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/tonight", label: "Tonight" },
  { href: "/activities", label: "Explore" },
  { href: "/resorts", label: "Resorts" },
  { href: "/plan", label: "My Plan" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-display truncate text-lg font-semibold tracking-tight text-[var(--brand-ink)]"
          >
            After the Parks
          </Link>
          <span className="stamp-badge hidden shrink-0 sm:inline-flex">
            Independent Guide
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                isActive(pathname, item.href)
                  ? "bg-[var(--lagoon)]/12 text-[var(--lagoon-deep)]"
                  : "text-[var(--muted)] hover:text-[var(--brand-ink)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/search"
          className="btn-secondary shrink-0 text-sm"
          aria-label="Search activities"
        >
          Search
        </Link>
      </div>
    </header>
  );
}
