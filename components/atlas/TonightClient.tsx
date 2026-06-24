"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { usePlan } from "@/components/atlas/PlanProvider";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { shouldHideActivity, occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { dedupeOccurrences } from "@/lib/api/publicActivities";
import { MovieCard } from "@/components/tonight/MovieCard";
import { NightEmptyState } from "@/components/tonight/NightEmptyState";
import { NightActivityCard } from "@/components/tonight/NightActivityCard";
import { EventCardList, EventCardListItem } from "@/components/events/EventCardList";
import { TonightHero } from "@/components/tonight/TonightHero";
import { EmptyState } from "@/components/atlas/EmptyState";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";

const AFTER_DINNER_CATEGORIES = new Set([
  "nighttime_entertainment",
  "music",
  "movies_under_stars",
]);

const RAIN_FRIENDLY_CATEGORIES = new Set(["arcade", "arts_crafts"]);

const LOW_ENERGY_CATEGORIES = new Set([
  "fitness_wellness",
  "resort_activity",
  "nature",
  "scavenger_hunt",
  "poolside",
  "signature",
]);

function NightSectionEmpty({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: { label: string; href: string; variant?: "primary" | "secondary" }[];
}) {
  return <NightEmptyState title={title} description={description} actions={actions} />;
}

function filterVisible(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  return dedupeOccurrences(
    activities.filter((a) => !shouldHideActivity(occurrenceToDisplayInput(a)))
  );
}

function dedupeBySlot(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  return activities.filter((a) => {
    const key = `${a.activityCatalogId}:${a.resort.slug}:${a.startDateTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TonightClient({
  activities,
  movieNights,
  filteredMode = false,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
  filteredMode?: boolean;
}) {
  const { addActivity } = usePlan();
  const { setForceDaypart } = useDaypart();

  useEffect(() => {
    setForceDaypart("evening");
    return () => setForceDaypart(null);
  }, [setForceDaypart]);

  const visibleActivities = dedupeBySlot(filterVisible(activities));
  const campfires = visibleActivities.filter((a) => a.category === "campfire");
  const afterDinner = visibleActivities.filter((a) =>
    AFTER_DINNER_CATEGORIES.has(a.category)
  );
  const rainFriendly = visibleActivities.filter((a) =>
    RAIN_FRIENDLY_CATEGORIES.has(a.category)
  );
  const lowEnergy = visibleActivities.filter(
    (a) =>
      LOW_ENERGY_CATEGORIES.has(a.category) &&
      !AFTER_DINNER_CATEGORIES.has(a.category)
  );

  const tonightMovies = movieNights.filter((m) => m.isTonight);
  const weekMovies = movieNights.filter((m) => !m.isTonight);

  if (filteredMode) {
    const showMovies = movieNights.length > 0;

    if (visibleActivities.length === 0 && !showMovies) {
      return (
        <EmptyState
          title="No tonight picks match your filters"
          description="Try clearing a filter or browse all evening activities across the resorts."
          actions={[
            { label: "Clear filters", href: "/tonight", variant: "primary" },
            { label: "Explore activities", href: "/activities?daypart=evening" },
            { label: "Browse resorts", href: "/resorts" },
          ]}
        />
      );
    }

    return (
      <div className="space-y-8 pb-8">
        <p className="tonight-callout">
          Filtered evening picks — confirm showtimes with your resort before heading out.
        </p>
        {visibleActivities.length > 0 && (
          <EventCardList columns={2}>
            {visibleActivities.map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
        {showMovies && (
          <section className="space-y-4">
            <h2 className="home-section__title text-xl md:text-2xl">
              Movies under the stars
            </h2>
            <EventCardList>
              {movieNights.map((movie) => (
                <EventCardListItem key={movie.id}>
                  <MovieCard movie={movie} />
                </EventCardListItem>
              ))}
            </EventCardList>
            <TmdbAttribution className="border-t border-[var(--border-soft)] pt-6 text-[var(--muted)]" />
          </section>
        )}
      </div>
    );
  }

  const hasAnyContent =
    movieNights.length > 0 ||
    campfires.length > 0 ||
    afterDinner.length > 0 ||
    rainFriendly.length > 0 ||
    lowEnergy.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="space-y-8">
        <TonightHero />
        <NightSectionEmpty
          title="Tonight's schedule is still settling in"
          description="We haven't confirmed evening activities yet. Explore all activities, browse resorts, or check back after the next schedule update."
          actions={[
            { label: "Explore activities", href: "/activities", variant: "primary" },
            { label: "Browse resorts", href: "/resorts" },
            { label: "See today", href: "/today" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-14 scroll-mt-24 pb-8">
      <TonightHero />

      <p className="tonight-callout">
        Confirm showtimes with your resort before heading out — outdoor schedules
        can shift with weather.
      </p>

      <section id="movies" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Movies under the stars
          </h2>
          <p className="home-section__subtitle md:text-base">
            Outdoor cinema schedules from resort recreation calendars.
          </p>
        </div>

        {movieNights.length === 0 ? (
          <NightSectionEmpty
            title="No movie listings yet"
            description="Outdoor cinema schedules are updating. Try campfires and low-key evening activities, or browse all resort fun."
            actions={[
              { label: "Campfires", href: "#campfires", variant: "primary" },
              { label: "Explore activities", href: "/activities" },
              { label: "Search", href: "/search" },
            ]}
          />
        ) : (
          <div className="space-y-10">
            {tonightMovies.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[var(--lagoon-deep)]">
                  Tonight
                </h3>
                <EventCardList>
                  {tonightMovies.map((movie) => (
                    <EventCardListItem key={movie.id}>
                      <MovieCard movie={movie} />
                    </EventCardListItem>
                  ))}
                </EventCardList>
              </div>
            )}
            {weekMovies.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                  {tonightMovies.length > 0 ? "Rest of the week" : "This week"}
                </h3>
                <EventCardList>
                  {weekMovies.map((movie) => (
                    <EventCardListItem key={movie.id}>
                      <MovieCard movie={movie} />
                    </EventCardListItem>
                  ))}
                </EventCardList>
              </div>
            )}
            <TmdbAttribution className="border-t border-[var(--border-soft)] pt-6 text-[var(--muted)]" />
          </div>
        )}
      </section>

      <section id="campfires" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Campfires
          </h2>
          <p className="home-section__subtitle md:text-base">
            Marshmallows, stories, and lantern-lit evenings across the resorts.
          </p>
        </div>

        {campfires.length === 0 ? (
          <NightSectionEmpty
            title="No campfires confirmed for tonight"
            description="Schedules shift often. Movies under the stars and low-key resort activities may still be a great fit."
            actions={[
              { label: "See movies", href: "#movies", variant: "primary" },
              { label: "Low-key ideas", href: "#low-energy" },
              { label: "Explore all", href: "/activities?category=campfire" },
            ]}
          />
        ) : (
          <EventCardList columns={2}>
            {campfires.slice(0, 6).map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
      </section>

      <section id="after-dinner" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            After-dinner activities
          </h2>
          <p className="home-section__subtitle md:text-base">
            Music, entertainment, and evening resort moments once the parks wind down.
          </p>
        </div>

        {afterDinner.length === 0 ? (
          <NightSectionEmpty
            title="No after-dinner picks confirmed"
            description="Try movies or campfires, or browse all evening activities."
            actions={[
              { label: "Movies", href: "#movies", variant: "primary" },
              { label: "Explore evening", href: "/activities?daypart=evening" },
            ]}
          />
        ) : (
          <EventCardList columns={2}>
            {afterDinner.slice(0, 6).map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
      </section>

      <section id="low-energy" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Low-energy evening ideas
          </h2>
          <p className="home-section__subtitle md:text-base">
            Cozy crafts, wellness, and easy resort moments when you want to wind down.
          </p>
        </div>

        {lowEnergy.length === 0 ? (
          <NightSectionEmpty
            title="No low-key evening picks right now"
            description="Try movies or campfires, or browse the full resort activity calendar."
            actions={[
              { label: "Movies tonight", href: "#movies", variant: "primary" },
              { label: "Explore activities", href: "/activities" },
              { label: "Browse resorts", href: "/resorts" },
            ]}
          />
        ) : (
          <EventCardList columns={2}>
            {lowEnergy.slice(0, 6).map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
      </section>

      <section id="rain-friendly" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="home-section__title text-2xl md:text-3xl">
            Rain-friendly evening ideas
          </h2>
          <p className="home-section__subtitle md:text-base">
            Indoor arcade and craft options when the Florida sky has other plans.
          </p>
        </div>

        {rainFriendly.length === 0 ? (
          <NightSectionEmpty
            title="No indoor evening picks listed"
            description="Browse arcade and craft activities across all resorts."
            actions={[
              { label: "Arcade", href: "/activities?category=arcade", variant: "primary" },
              { label: "Crafts", href: "/activities?category=arts_crafts" },
            ]}
          />
        ) : (
          <EventCardList columns={2}>
            {rainFriendly.slice(0, 6).map((activity) => (
              <EventCardListItem key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </EventCardListItem>
            ))}
          </EventCardList>
        )}
      </section>

      {weekMovies.length > 0 && (
        <section id="tomorrow-preview" className="scroll-mt-24">
          <div className="mb-5">
            <h2 className="home-section__title text-2xl md:text-3xl">
              Coming up this week
            </h2>
            <p className="home-section__subtitle">
              Plan ahead —{" "}
              <Link href="/tonight" className="home-section__link">
                see the full week
              </Link>
              .
            </p>
          </div>
          <EventCardList compact>
            {weekMovies.slice(0, 4).map((movie) => (
              <EventCardListItem key={movie.id}>
                <MovieCard movie={movie} />
              </EventCardListItem>
            ))}
          </EventCardList>
        </section>
      )}
    </div>
  );
}
