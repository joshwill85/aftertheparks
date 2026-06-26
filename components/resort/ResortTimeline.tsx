import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { formatOrlandoDate } from "@/lib/daypart";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

function groupByDate(activities: ActivityOccurrence[]) {
  const groups = new Map<string, ActivityOccurrence[]>();
  const untimed: ActivityOccurrence[] = [];

  for (const activity of activities) {
    if (!activity.startDateTime) {
      untimed.push(activity);
      continue;
    }
    const key = activity.startDateTime.slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(activity);
    groups.set(key, list);
  }

  return {
    dated: [...groups.entries()],
    untimed,
  };
}

export function ResortTimeline({
  activities,
}: {
  activities: ActivityOccurrence[];
}) {
  const { dated, untimed } = groupByDate(activities);

  if (activities.length === 0) {
    return (
      <ActivityGrid
        activities={[]}
        showResort={false}
        emptyMessage="No dated activities published for this resort yet."
      />
    );
  }

  return (
    <div className="space-y-8">
      {dated.map(([date, items]) => (
        <section key={date} aria-label={formatOrlandoDate(items[0].startDateTime!)}>
          <h3 className="mb-3 font-display text-lg font-semibold">
            {formatOrlandoDate(items[0].startDateTime!)}
            <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
              {items.length} {items.length === 1 ? "activity" : "activities"}
            </span>
          </h3>
          <ActivityGrid activities={items} showResort={false} columns={2} />
        </section>
      ))}

      {untimed.length > 0 && (
        <section aria-label="More activities">
          <h3 className="mb-3 font-display text-lg font-semibold">
            More activities
            <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
              {untimed.length} {untimed.length === 1 ? "activity" : "activities"}
            </span>
          </h3>
          <ActivityGrid activities={untimed} showResort={false} columns={2} />
        </section>
      )}
    </div>
  );
}
