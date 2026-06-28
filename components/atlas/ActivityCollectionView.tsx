"use client";

import { useMemo, useState } from "react";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { getCategoryMeta } from "@/lib/categories/meta";
import { sortActivities } from "@/lib/activities/sort";
import { formatOrlandoDate } from "@/lib/daypart";
import type { ActivityOccurrence, ActivitySortKey } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

type ActivityCollectionViewKey = "cards" | "day" | "category";

const VIEW_OPTIONS: {
  value: ActivityCollectionViewKey;
  label: string;
  iconKey: "search_activity" | "today_nav" | "search_category";
}[] = [
  { value: "cards", label: "Cards", iconKey: "search_activity" },
  { value: "day", label: "By day", iconKey: "today_nav" },
  { value: "category", label: "By category", iconKey: "search_category" },
];

const SORT_OPTIONS: { value: ActivitySortKey; label: string }[] = [
  { value: "time", label: "Earliest" },
  { value: "alpha", label: "A-Z" },
  { value: "free", label: "Free first" },
  { value: "paid", label: "Paid first" },
  { value: "category", label: "Category" },
];

function occurrenceKey(activity: ActivityOccurrence): string {
  return `${activity.activityCatalogId}:${activity.resort.slug}:${activity.startDateTime ?? activity.id}`;
}

function experienceKey(activity: ActivityOccurrence): string {
  const titleKey = activity.activityCatalogId || activity.title.toLowerCase().trim();
  const locationKey = activity.location.label.toLowerCase().trim();
  return `${titleKey}:${activity.resort.slug}:${activity.category}:${locationKey}`;
}

function uniqueOccurrences(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    const key = occurrenceKey(activity);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueExperiences(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const byExperience = new Map<string, ActivityOccurrence>();
  for (const activity of activities) {
    const key = experienceKey(activity);
    const existing = byExperience.get(key);
    if (!existing) {
      byExperience.set(key, activity);
      continue;
    }
    if (!existing.startDateTime && activity.startDateTime) {
      byExperience.set(key, activity);
      continue;
    }
    if (
      existing.startDateTime &&
      activity.startDateTime &&
      activity.startDateTime < existing.startDateTime
    ) {
      byExperience.set(key, activity);
    }
  }
  return [...byExperience.values()];
}

function groupByDay(activities: ActivityOccurrence[]) {
  const groups = new Map<string, ActivityOccurrence[]>();
  const untimed: ActivityOccurrence[] = [];
  for (const activity of activities) {
    if (!activity.startDateTime) {
      untimed.push(activity);
      continue;
    }
    const key = activity.startDateTime.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), activity]);
  }
  return {
    dated: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)),
    untimed,
  };
}

function groupByCategory(activities: ActivityOccurrence[]) {
  const groups = new Map<string, ActivityOccurrence[]>();
  for (const activity of activities) {
    groups.set(activity.category, [...(groups.get(activity.category) ?? []), activity]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const metaA = getCategoryMeta(a);
    const metaB = getCategoryMeta(b);
    return metaA.label.localeCompare(metaB.label);
  });
}

export function ActivityCollectionView({
  activities,
  showResort = false,
  defaultView = "cards",
  defaultSort = "time",
  emptyMessage = "No activities match this view.",
}: {
  activities: ActivityOccurrence[];
  showResort?: boolean;
  defaultView?: ActivityCollectionViewKey;
  defaultSort?: ActivitySortKey;
  emptyMessage?: string;
}) {
  const [view, setView] = useState<ActivityCollectionViewKey>(defaultView);
  const [sort, setSort] = useState<ActivitySortKey>(defaultSort);
  const sortedOccurrences = useMemo(
    () => sortActivities(uniqueOccurrences(activities), sort),
    [activities, sort]
  );
  const sortedExperiences = useMemo(
    () => sortActivities(uniqueExperiences(activities), sort),
    [activities, sort]
  );
  const dayGroups = useMemo(() => groupByDay(sortedOccurrences), [sortedOccurrences]);
  const categoryGroups = useMemo(() => groupByCategory(sortedExperiences), [sortedExperiences]);

  if (activities.length === 0) {
    return (
      <ActivityGrid
        activities={[]}
        showResort={showResort}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <div className="activity-collection-view">
      <div className="activity-collection-view__toolbar">
        <div className="activity-collection-view__tabs" aria-label="Activity view">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "activity-collection-view__tab",
                view === option.value && "activity-collection-view__tab--active"
              )}
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
            >
              <IconGlyph iconKey={option.iconKey} decorative />
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <label className="activity-collection-view__sort">
          <span>Sort</span>
          <select
            className="form-control"
            value={sort}
            onChange={(event) => setSort(event.target.value as ActivitySortKey)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === "cards" && (
        <ActivityGrid
          activities={sortedExperiences}
          showResort={showResort}
          columns={2}
          emptyMessage={emptyMessage}
        />
      )}

      {view === "day" && (
        <div className="space-y-8">
          {dayGroups.dated.map(([date, items]) => (
            <section key={date} aria-label={formatOrlandoDate(`${date}T12:00:00`)}>
              <h3 className="mb-3 font-display text-lg font-semibold">
                {formatOrlandoDate(`${date}T12:00:00`)}
                {" "}
                <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                  {items.length} {items.length === 1 ? "activity" : "activities"}
                </span>
              </h3>
              <ActivityGrid activities={items} showResort={showResort} columns={2} />
            </section>
          ))}
          {dayGroups.untimed.length > 0 && (
            <section aria-label="Anytime activities">
              <h3 className="mb-3 font-display text-lg font-semibold">
                Anytime
                {" "}
                <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                  {dayGroups.untimed.length}{" "}
                  {dayGroups.untimed.length === 1 ? "activity" : "activities"}
                </span>
              </h3>
              <ActivityGrid
                activities={dayGroups.untimed}
                showResort={showResort}
                columns={2}
              />
            </section>
          )}
        </div>
      )}

      {view === "category" && (
        <div className="space-y-8">
          {categoryGroups.map(([category, items]) => {
            const meta = getCategoryMeta(category);
            return (
              <section key={category} aria-label={meta.label}>
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                  <IconGlyph iconKey={meta.iconKey} decorative />
                  {meta.label}
                  {" "}
                  <span className="text-sm font-normal text-[var(--color-muted)]">
                    {items.length}
                  </span>
                </h3>
                <ActivityGrid activities={items} showResort={showResort} columns={2} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
