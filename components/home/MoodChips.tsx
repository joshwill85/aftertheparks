"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isMoodChipActive } from "@/lib/ui/moodChipActive";
import { cn } from "@/lib/utils";
import { HOME_MOOD_CHIPS } from "./MoodChips.data";

export function MoodChips() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mood-chips-scroll">
      <div className="mood-chips">
        {HOME_MOOD_CHIPS.map((chip) => {
          const active = isMoodChipActive(chip.href, pathname, searchParams);
          return (
            <Link
              key={chip.id}
              href={chip.href}
              className={cn("mood-chip", active && "mood-chip--active")}
              aria-current={active ? "page" : undefined}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
