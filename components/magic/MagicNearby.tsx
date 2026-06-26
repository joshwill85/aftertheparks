import Link from "next/link";
import {
  classifyNearbyTier,
  NEARBY_TIER_META,
  type NearbyTier,
} from "@/lib/magic/nearby";
import { activityDetailHref } from "@/lib/activities/links";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

interface MagicNearbyBadgeProps {
  activity: ActivityOccurrence;
  homeResort?: { slug: string; area: string };
  className?: string;
}

export function MagicNearbyBadge({
  activity,
  homeResort,
  className,
}: MagicNearbyBadgeProps) {
  const tier = classifyNearbyTier(activity, homeResort);
  if (tier === "skip") return null;

  const meta = NEARBY_TIER_META[tier];

  return (
    <div
      className={cn(
        "magic-nearby-badge rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-sun-cream)]/60 px-4 py-3",
        className
      )}
    >
      <p className="flex items-center gap-2 text-sm font-bold">
        <span aria-hidden>{meta.icon}</span>
        {meta.label}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{meta.description}</p>
    </div>
  );
}

interface MagicNearbyCollectionsProps {
  activities: ActivityOccurrence[];
  homeResort?: { slug: string; area: string };
  title?: string;
}

export function MagicNearbyCollections({
  activities,
  homeResort,
  title = "Magic nearby",
}: MagicNearbyCollectionsProps) {
  const tiers: Exclude<NearbyTier, "skip">[] = [
    "at_resort",
    "one_ride",
    "worth_travel",
  ];

  const grouped = tiers
    .map((tier) => ({
      tier,
      meta: NEARBY_TIER_META[tier],
      items: activities.filter(
        (activity) => classifyNearbyTier(activity, homeResort) === tier
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (grouped.length === 0) return null;

  return (
    <section className="magic-nearby" aria-labelledby="magic-nearby-heading">
      <h2 id="magic-nearby-heading" className="font-display text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        How far you&apos;ll go for resort magic from your home base.
      </p>

      <div className="mt-4 space-y-4">
        {grouped.map((group) => (
          <div
            key={group.tier}
            className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
          >
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <span aria-hidden>{group.meta.icon}</span>
              {group.meta.label}
            </h3>
            <ul className="mt-3 space-y-2">
              {group.items.slice(0, 4).map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={activityDetailHref(
                      activity.activitySlug,
                      activity.resort.slug
                    )}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-[var(--color-sun-cream)]"
                  >
                    <span className="font-bold">{activity.title}</span>
                    <span className="shrink-0 text-[var(--color-muted)]">
                      {activity.resort.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
