"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlan } from "@/components/atlas/PlanProvider";

export function ExplorePlanRail() {
  const { items } = usePlan();
  const [mounted, setMounted] = useState(false);
  const visibleItems = mounted ? items : [];

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <aside className="plan-rail-wrapper hidden min-[1280px]:block">
      <div className="plan-rail sticky top-24 space-y-4 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">My Plan</h2>
          <Link
            href="/plan"
            className="text-sm font-bold text-[var(--accent)] hover:underline"
          >
            Open
          </Link>
        </div>

        {visibleItems.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Save activities as you browse and build a low-stress rest day.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleItems.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--color-card-border)] px-3 py-2.5"
              >
                <p className="text-sm font-bold leading-snug">{item.title}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {item.resortName}
                </p>
              </li>
            ))}
          </ul>
        )}

        {visibleItems.length > 0 && (
          <Link href="/plan" className="btn-primary w-full text-sm">
            View full plan ({visibleItems.length})
          </Link>
        )}
      </div>
    </aside>
  );
}
