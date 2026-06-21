"use client";

import Link from "next/link";
import { formatOrlandoDate, formatOrlandoTime } from "@/lib/daypart";
import { getCategoryMeta } from "@/lib/categories/meta";
import { isUncertainSchedule } from "@/lib/text/normalize";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { FreshnessMeta } from "@/components/activity/FreshnessMeta";
import { SaveButton } from "@/components/activity/SaveButton";
import { usePlan } from "@/components/atlas/PlanProvider";

function dedupeUpcoming(upcoming: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  const result: ActivityOccurrence[] = [];
  for (const o of upcoming) {
    const key = `${o.startDateTime}-${o.endDateTime ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(o);
  }
  return result;
}

export function ActivityDetailClient({
  activity,
  upcoming,
}: {
  activity: ActivityOccurrence;
  upcoming: ActivityOccurrence[];
}) {
  const { addActivity, isInPlan } = usePlan();
  const inPlan = isInPlan(activity.activityCatalogId);
  const meta = getCategoryMeta(activity.category);
  const scheduleRows = dedupeUpcoming(upcoming);
  const uncertainTime = isUncertainSchedule(activity.scheduleText);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="postcard-texture rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              When
            </p>
            <p className="font-display mt-2 font-semibold">
              {uncertainTime
                ? "Confirm with resort"
                : scheduleRows[0]
                  ? `${formatOrlandoDate(scheduleRows[0].startDateTime)} · ${formatOrlandoTime(scheduleRows[0].startDateTime)}`
                  : formatOrlandoTime(activity.startDateTime)}
            </p>
          </div>
          <div className="postcard-texture rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Cost
            </p>
            <p className="font-display mt-2 font-semibold capitalize">
              {activity.price.state === "unknown" ? "Check resort" : activity.price.state}
            </p>
          </div>
          <div className="postcard-texture rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Best for
            </p>
            <p className="font-display mt-2 font-semibold">
              {meta.label} · {activity.eligibility.ages.join(", ").replace(/_/g, " ")}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl font-semibold">What to expect</h2>
          <p className="mt-3 leading-relaxed text-[var(--color-muted)]">{activity.summary}</p>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl font-semibold">Where to go</h2>
          <p className="mt-3 font-medium">{activity.location.label}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{activity.resort.name}</p>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl font-semibold">Schedule</h2>
          {uncertainTime && (
            <p className="mt-2 text-sm text-[var(--color-coral)]">
              Times may need official confirmation — check the resort recreation guide before
              heading out.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {scheduleRows.length > 0 ? (
              scheduleRows.map((o) => (
                <li
                  key={o.id}
                  className="flex justify-between border-b border-[var(--color-card-border)] pb-2 text-sm last:border-0"
                >
                  <span>{formatOrlandoDate(o.startDateTime)}</span>
                  <span className="font-medium">
                    {formatOrlandoTime(o.startDateTime)}
                    {o.endDateTime && ` – ${formatOrlandoTime(o.endDateTime)}`}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-[var(--color-muted)]">
                {activity.scheduleText && !isUncertainSchedule(activity.scheduleText)
                  ? activity.scheduleText
                  : "See the official resort recreation guide for the latest schedule."}
              </li>
            )}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <span className="stamp-badge">
            <span aria-hidden>{meta.icon}</span>
            {activity.freshness.badge === "verified" ? "Verified" : "May be outdated"}
          </span>
          <FreshnessMeta freshness={activity.freshness} className="mt-4" />
          <SaveButton
            saved={inPlan}
            onSave={() => addActivity(activity)}
            className="mt-4 w-full justify-center"
          />
          <Link
            href={`/resorts/${activity.resort.slug}`}
            className="mt-2 block text-center text-sm text-[var(--color-muted)] hover:text-[var(--accent)]"
          >
            More at {activity.resort.name}
          </Link>
        </div>
      </aside>
    </div>
  );
}
