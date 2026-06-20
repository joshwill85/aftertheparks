"use client";

import Link from "next/link";
import { formatOrlandoDate, formatOrlandoTime } from "@/lib/daypart";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { FreshnessBadge } from "@/components/atlas/FreshnessBadge";
import { usePlan } from "@/components/atlas/PlanProvider";

export function ActivityDetailClient({
  activity,
  upcoming,
}: {
  activity: ActivityOccurrence;
  upcoming: ActivityOccurrence[];
}) {
  const { addActivity, isInPlan } = usePlan();
  const inPlan = isInPlan(activity.activityCatalogId);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl font-semibold">Schedule</h2>
          <ul className="mt-4 space-y-3">
            {upcoming.length > 0 ? (
              upcoming.map((o) => (
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
                {activity.scheduleText ?? "See resort recreation guide for times."}
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl font-semibold">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-muted)]">Location</dt>
              <dd className="font-medium">{activity.location.label}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Price</dt>
              <dd className="font-medium capitalize">
                {activity.price.state}
                {activity.price.notes && ` — ${activity.price.notes}`}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Ages</dt>
              <dd className="font-medium">
                {activity.eligibility.ages.join(", ").replace(/_/g, " ")}
              </dd>
            </div>
            {activity.eligibility.reservation && (
              <div>
                <dt className="text-[var(--color-muted)]">Reservation</dt>
                <dd className="font-medium">
                  {activity.eligibility.reservation.required ? "Required" : "Not required"}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <FreshnessBadge freshness={activity.freshness} />
          {activity.freshness.sourceUrl && (
            <a
              href={activity.freshness.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-sm text-[var(--accent)] hover:underline"
            >
              View official source →
            </a>
          )}
          <button
            type="button"
            disabled={inPlan}
            onClick={() => addActivity(activity)}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {inPlan ? "In your plan" : "Save to plan"}
          </button>
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
