"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/today", label: "Today" },
  { href: "/tonight", label: "Tonight" },
  { href: "/activities", label: "Explore" },
  { href: "/resorts", label: "Resorts" },
  { href: "/plan", label: "My Plan" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-card-border)] bg-[var(--color-card)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          After the Parks
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/search"
          className="rounded-full border border-[var(--color-card-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Search activities"
        >
          Search
        </Link>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden"
        aria-label="Mobile"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs",
              pathname === item.href
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-[var(--color-muted)]"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-card-border)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[var(--color-muted)] md:flex-row md:justify-between">
        <p>
          After the Parks is an independent guide. Not affiliated with Disney.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-[var(--accent)]">
            About
          </Link>
          <Link href="/data-sources" className="hover:text-[var(--accent)]">
            Data Sources
          </Link>
          <Link href="/corrections" className="hover:text-[var(--accent)]">
            Corrections
          </Link>
          <Link href="/guides/first-night-at-the-resort" className="hover:text-[var(--accent)]">
            Guides
          </Link>
        </div>
      </div>
    </footer>
  );
}
