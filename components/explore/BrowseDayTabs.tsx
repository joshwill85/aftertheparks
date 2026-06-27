"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { BROWSE_DAY_TABS } from "@/components/icons/iconRegistry";
import { buildBrowseHref, isBrowsePath } from "@/lib/explore/browseParams";
import { cn } from "@/lib/utils";

export function BrowseDayTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!isBrowsePath(pathname)) return null;

  return (
    <nav
      className={cn("browse-day-tabs", className)}
      aria-label="Browse by day"
    >
      <div className="browse-day-tabs__track" role="tablist">
        {BROWSE_DAY_TABS.map((tab) => {
          const active = pathname === tab.href;
          const href = buildBrowseHref(tab.href, searchParams);
          return (
            <Link
              key={tab.href}
              href={href}
              role="tab"
              aria-selected={active}
              className={cn(
                "browse-day-tabs__tab",
                active && "browse-day-tabs__tab--active"
              )}
            >
              <span className="browse-day-tabs__icon" aria-hidden>
                <IconGlyph iconKey={tab.iconKey} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
