"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { formatOrlandoTime } from "@/lib/daypart";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn, formatCategory } from "@/lib/utils";
import { FreshnessBadge } from "@/components/atlas/FreshnessBadge";

interface ActivityCardProps {
  activity: ActivityOccurrence;
  showResort?: boolean;
  onSave?: (activity: ActivityOccurrence) => void;
}

export function ActivityCard({
  activity,
  showResort = true,
  onSave,
}: ActivityCardProps) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.article
      layoutId={`activity-${activity.activitySlug}`}
      whileHover={reducedMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-sm backdrop-blur-sm",
        activity.isHappeningNow && "happening-pulse ring-2 ring-[var(--color-citrus)]/50"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at top right, var(--hero-glow), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
            {formatCategory(activity.category)}
          </span>
          {activity.isHappeningNow && (
            <span className="rounded-full bg-[var(--color-citrus)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--color-citrus)]">
              Happening now
            </span>
          )}
          {activity.price.state === "free" && (
            <span className="text-xs text-[var(--color-muted)]">Free</span>
          )}
        </div>

        <Link href={`/activities/${activity.activitySlug}`} className="block">
          <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-[var(--accent)]">
            {activity.title}
          </h3>
          {showResort && (
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {activity.resort.name}
            </p>
          )}
          <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
            {activity.summary}
          </p>
          <p className="mt-3 text-sm font-medium">
            {formatOrlandoTime(activity.startDateTime)}
            {activity.endDateTime &&
              ` – ${formatOrlandoTime(activity.endDateTime)}`}
          </p>
        </Link>

        <div className="mt-3 flex items-center justify-between gap-2">
          <FreshnessBadge freshness={activity.freshness} />
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(activity)}
              className="rounded-full border border-[var(--color-card-border)] px-3 py-1 text-xs hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
