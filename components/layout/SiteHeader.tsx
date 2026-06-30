"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { resolveBrowseNavHref } from "@/lib/explore/browseParams";
import { PlanNavLink } from "@/components/plan/PlanNavLink";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/tonight", label: "Tonight" },
  { href: "/calendar", label: "Plan Ahead" },
  { href: "/activities", label: "Activities" },
  { href: "/resorts", label: "Resorts" },
  { href: "/weather", label: "Weather" },
  { href: "/plan", label: "My Plan" },
  { href: "/search", label: "Search" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <header className="site-header">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="site-brand-cluster">
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
          <span className="stamp-badge site-brand__badge hidden shrink-0 sm:inline-flex">
            Independent Guide
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            if (item.href === "/plan") {
              return (
                <PlanNavLink
                  key={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors",
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
                "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors",
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
      </div>
    </header>
  );
}
