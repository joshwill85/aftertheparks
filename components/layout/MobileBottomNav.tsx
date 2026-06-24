"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { resolveBrowseNavHref } from "@/lib/explore/browseParams";
import { usePlan } from "@/components/atlas/PlanProvider";

const TABS = [
  {
    href: "/today",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    href: "/tonight",
    label: "Tonight",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
      </svg>
    ),
  },
  {
    href: "/activities",
    label: "Explore",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: "/plan",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { itemCount } = usePlan();

  return (
    <nav
      className="mobile-bottom-nav flex items-stretch justify-around md:hidden"
      aria-label="Mobile"
    >
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
            {tab.icon}
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
