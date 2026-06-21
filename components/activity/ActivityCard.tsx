"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ActivityBadge } from "@/components/activity/ActivityBadge";
import { CategoryIcon } from "@/components/activity/CategoryIcon";
import { FreshnessMeta } from "@/components/activity/FreshnessMeta";
import { SaveButton } from "@/components/activity/SaveButton";
import { TrustBadge } from "@/components/activity/TrustBadge";
import { usePlan } from "@/components/atlas/PlanProvider";
import {
  getDisplaySummary,
  getDisplayTime,
  getDisplayTitle,
  getTrustState,
  occurrenceToDisplayInput,
} from "@/lib/activityDisplay";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: ActivityOccurrence;
  showResort?: boolean;
  onSave?: (activity: ActivityOccurrence) => void;
}

const DAYPART_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  late: "Starlight",
};

function priceBadgeVariant(
  state: ActivityOccurrence["price"]["state"]
): "free" | "paid" | "unknown" {
  if (state === "free") return "free";
  if (state === "fee") return "paid";
  return "unknown";
}

function priceLabel(state: ActivityOccurrence["price"]["state"]): string {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return "Price unclear";
}

export function ActivityCard({
  activity,
  showResort = true,
  onSave,
}: ActivityCardProps) {
  const { isInPlan } = usePlan();
  const saved = isInPlan(activity.activityCatalogId);
  const display = occurrenceToDisplayInput(activity);
  const title = getDisplayTitle(display);
  const summary = getDisplaySummary(display);
  const time = getDisplayTime(display);
  const trustState = getTrustState(display);
  const showTrustBadge =
    trustState !== "verified" && trustState !== "recently_updated";

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const locationParts = [
    showResort ? activity.resort.name : null,
    activity.location.label &&
    activity.location.label !== "Resort" &&
    activity.location.label !== activity.resort.name
      ? activity.location.label
      : null,
  ].filter(Boolean);

  return (
    <motion.article
      layoutId={`activity-${activity.id}`}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "activity-card group grid grid-cols-1 gap-4 overflow-hidden rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-sm backdrop-blur-sm transition-[box-shadow,border-color] duration-180 sm:grid-cols-[112px_1fr]",
        activity.isHappeningNow &&
          "happening-pulse ring-2 ring-[var(--color-citrus)]/40",
        (activity.daypart === "evening" || activity.daypart === "late") &&
          "lantern-glow"
      )}
    >
      <div
        className={cn(
          "activity-card-media relative flex min-h-[116px] items-center justify-center rounded-[22px] sm:min-h-[132px]",
          `category-${activity.category}`
        )}
      >
        <CategoryIcon category={activity.category} />
      </div>

      <div className="activity-card-body flex min-w-0 flex-col">
        <div className="card-topline flex flex-wrap items-center gap-1.5">
          <ActivityBadge variant={priceBadgeVariant(activity.price.state)}>
            {priceLabel(activity.price.state)}
          </ActivityBadge>
          {activity.isHappeningNow && (
            <ActivityBadge variant="happening">Now</ActivityBadge>
          )}
          <ActivityBadge variant="daypart">
            {DAYPART_LABELS[activity.daypart] ?? activity.daypart}
          </ActivityBadge>
          {time.uncertain && (
            <ActivityBadge variant="warning">Confirm time</ActivityBadge>
          )}
          {showTrustBadge && <TrustBadge activity={activity} />}
        </div>

        <Link href={`/activities/${activity.activitySlug}`} className="block">
          <h3 className="mt-2.5 font-display text-xl font-semibold leading-tight group-hover:text-[var(--accent)] sm:text-[1.45rem]">
            {title}
          </h3>

          {locationParts.length > 0 && (
            <p className="mt-1 text-sm font-bold text-[var(--color-foreground)]/72">
              {locationParts.join(" · ")}
            </p>
          )}

          <p
            className={cn(
              "mt-2 text-sm font-bold",
              time.uncertain
                ? "text-[#7a4a00]"
                : "text-[var(--color-lagoon)]"
            )}
          >
            {time.label}
          </p>

          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {summary}
          </p>
        </Link>

        <FreshnessMeta freshness={activity.freshness} className="mt-3" />

        <div className="card-actions mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/activities/${activity.activitySlug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 text-sm font-bold hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Details
          </Link>
          {onSave && (
            <SaveButton
              saved={saved}
              onSave={() => onSave(activity)}
            />
          )}
        </div>
      </div>
    </motion.article>
  );
}
