"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { resolveBrowseNavHref } from "@/lib/explore/browseParams";
import { PlanNavLink } from "@/components/plan/PlanNavLink";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/weather", label: "Weather" },
  { href: "/activities", label: "Explore" },
  { href: "/calendar", label: "Plan Ahead" },
  { href: "/resorts", label: "Resorts" },
  { href: "/plan", label: "My Plan" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const todayHref = resolveBrowseNavHref("/today", pathname, searchParams);
  const tonightHref = resolveBrowseNavHref("/tonight", pathname, searchParams);
  const nowActive = isActive(pathname, "/today") || isActive(pathname, "/tonight");

  return (
    <header className="site-header">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="site-brand"
            aria-label="After the Parks home"
          >
            <BrandAsset
              asset="guide-companion"
              className="site-brand__icon"
              priority
            />
            <span className="site-brand__text">
              After the Parks
            </span>
          </Link>
          <span className="stamp-badge hidden shrink-0 sm:inline-flex">
            Independent Guide
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <div
            className={cn("now-split-nav", nowActive && "now-split-nav--active")}
            aria-label="Now"
          >
            <Link
              href={todayHref}
              className="now-split-nav__link now-split-nav__link--today"
              aria-current={isActive(pathname, "/today") ? "page" : undefined}
            >
              <span className="now-split-nav__sun" aria-hidden />
              <span>Today</span>
            </Link>
            <Link
              href={tonightHref}
              className="now-split-nav__link now-split-nav__link--tonight"
              aria-current={isActive(pathname, "/tonight") ? "page" : undefined}
            >
              <span className="now-split-nav__moon" aria-hidden />
              <span>Tonight</span>
            </Link>
          </div>
          {NAV.map((item) => {
            if (item.href === "/plan") {
              return (
                <PlanNavLink
                  key={item.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                    isActive(pathname, item.href)
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                />
              );
            }
            const href = resolveBrowseNavHref(item.href, pathname, searchParams);
            return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                isActive(pathname, item.href)
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {item.label}
            </Link>
            );
          })}
        </nav>

        <Link
          href="/search"
          className="btn-secondary inline-flex min-h-11 shrink-0 items-center justify-center text-sm"
          aria-label="Search activities"
        >
          Search
        </Link>
      </div>
    </header>
  );
}
