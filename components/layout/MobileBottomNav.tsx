"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { usePlan } from "@/components/atlas/PlanProvider";
import { IconGlyph } from "@/components/icons/IconGlyph";
import type { IconKey } from "@/components/icons/iconRegistry";
import { resolveBrowseNavHref } from "@/lib/explore/browseParams";

const TABS = [
  {
    href: "/activities",
    label: "Explore",
    iconKey: "explore_nav",
  },
  {
    href: "/calendar",
    label: "Plan Ahead",
    iconKey: "plan_nav",
  },
  {
    href: "/plan",
    label: "Plan",
    iconKey: "plan_nav",
  },
] satisfies { href: string; label: string; iconKey: IconKey }[];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { itemCount } = usePlan();
  const todayHref = resolveBrowseNavHref("/today", pathname, searchParams);
  const tonightHref = resolveBrowseNavHref("/tonight", pathname, searchParams);
  const nowActive = isActive(pathname, "/today") || isActive(pathname, "/tonight");

  return (
    <nav
      className="mobile-bottom-nav flex items-stretch justify-around md:hidden"
      aria-label="Mobile"
    >
      <div
        className="mobile-bottom-nav__link mobile-now-split"
        aria-current={nowActive ? "page" : undefined}
        aria-label="Now"
      >
        <span className="mobile-now-split__label">Now</span>
        <span className="mobile-now-split__actions">
          <Link
            href={todayHref}
            className="mobile-now-split__half mobile-now-split__half--today"
            aria-label="Today"
          >
            <IconGlyph iconKey="today_nav" />
            <span>Today</span>
          </Link>
          <Link
            href={tonightHref}
            className="mobile-now-split__half mobile-now-split__half--tonight"
            aria-label="Tonight"
          >
            <IconGlyph iconKey="tonight_nav" />
            <span>Night</span>
          </Link>
        </span>
      </div>
      {TABS.map((tab) => {
        const href = resolveBrowseNavHref(tab.href, pathname, searchParams);
        const showCount = tab.href === "/plan" && itemCount > 0;
        return (
          <Link
            key={tab.href}
            href={href}
            className="mobile-bottom-nav__link"
            aria-current={isActive(pathname, tab.href) ? "page" : undefined}
            aria-label={
              showCount ? `My Plan, ${itemCount} saved` : tab.label
            }
          >
            <IconGlyph iconKey={tab.iconKey} />
            <span>
              {tab.label}
              {showCount && (
                <span className="mobile-bottom-nav__badge" aria-hidden>
                  {itemCount}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
