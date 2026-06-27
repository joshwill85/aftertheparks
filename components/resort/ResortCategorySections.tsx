import Link from "next/link";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { IconGlyph } from "@/components/icons/IconGlyph";
import type { CategoryGroup } from "@/lib/resorts/sections";

export function ResortCategorySections({
  groups,
  resortSlug,
  limitPerGroup = 4,
}: {
  groups: CategoryGroup[];
  resortSlug: string;
  limitPerGroup?: number;
}) {
  if (groups.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="resort-categories-heading">
      <div className="mb-4">
        <h2 id="resort-categories-heading" className="font-display text-2xl font-semibold">
          By category
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Browse what this resort offers by type of experience.
        </p>
      </div>

      <div className="space-y-10">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                <IconGlyph iconKey={group.iconKey} className="text-xl" />
                {group.label}
                <span className="text-sm font-normal text-[var(--color-muted)]">
                  ({group.activities.length})
                </span>
              </h3>
              <Link
                href={`/activities?resort=${resortSlug}&category=${group.category}`}
                className="text-sm font-bold text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <ActivityGrid
              activities={group.activities.slice(0, limitPerGroup)}
              showResort={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
