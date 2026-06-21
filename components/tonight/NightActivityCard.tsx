"use client";

import Link from "next/link";
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

interface NightActivityCardProps {
  activity: ActivityOccurrence;
  onSave?: (activity: ActivityOccurrence) => void;
}

const DAYPART_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  late: "Starlight",
};

function priceLabel(state: ActivityOccurrence["price"]["state"]): string {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return "Price unclear";
}

export function NightActivityCard({ activity, onSave }: NightActivityCardProps) {
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
    activity.resort.name,
    activity.location.label &&
    activity.location.label !== "Resort" &&
    activity.location.label !== activity.resort.name
      ? activity.location.label
      : null,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "night-card group grid grid-cols-1 gap-4 overflow-hidden p-4 sm:grid-cols-[96px_1fr]",
        !reducedMotion && "transition-transform duration-300 hover:-translate-y-0.5",
        activity.isHappeningNow && "ring-2 ring-[var(--lantern)]/45 lantern-glow"
      )}
    >
      <div className="flex items-center justify-center sm:items-start">
        <CategoryIcon category={activity.category} size="sm" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
            {priceLabel(activity.price.state)}
          </span>
          {activity.isHappeningNow && (
            <span className="rounded-full bg-[var(--lantern)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--night)]">
              Now
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
            {DAYPART_LABELS[activity.daypart] ?? activity.daypart}
          </span>
          {time.uncertain && (
            <span className="rounded-full bg-[var(--lantern)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--lantern)]">
              Confirm time
            </span>
          )}
          {showTrustBadge && (
            <TrustBadge activity={activity} className="!bg-white/10 !text-white/85" />
          )}
        </div>

        <Link href={`/activities/${activity.activitySlug}`} className="block">
          <h3 className="mt-3 font-display text-xl font-semibold leading-tight text-white group-hover:text-[var(--lantern)]">
            {title}
          </h3>

          {locationParts.length > 0 && (
            <p className="mt-1 text-sm font-semibold text-white/72">
              {locationParts.join(" · ")}
            </p>
          )}

          <p
            className={cn(
              "mt-2 text-sm font-bold",
              time.uncertain ? "text-[var(--lantern)]" : "text-[var(--starlight)]"
            )}
          >
            {time.label}
          </p>

          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-white/62">
            {summary}
          </p>
        </Link>

        <FreshnessMeta
          freshness={activity.freshness}
          variant="night"
          className="mt-3"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/activities/${activity.activitySlug}`}
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/8 px-4 text-sm font-bold text-white hover:border-[var(--lantern)]/50 hover:text-[var(--lantern)]"
          >
            Details
          </Link>
          {onSave && (
            <SaveButton
              saved={saved}
              variant="night"
              onSave={() => onSave(activity)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
