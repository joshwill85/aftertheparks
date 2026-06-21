"use client";

import { useEffect } from "react";
import type { ActivityOccurrence, MovieNightOccurrence } from "@/lib/types/occurrence";
import { EmptyState } from "@/components/atlas/EmptyState";
import { TmdbAttribution } from "@/components/atlas/TmdbAttribution";
import { usePlan } from "@/components/atlas/PlanProvider";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { shouldHideActivity } from "@/lib/activityDisplay";
import { occurrenceToDisplayInput } from "@/lib/activityDisplay";
import { MovieCard } from "@/components/tonight/MovieCard";
import { NightActivityCard } from "@/components/tonight/NightActivityCard";
import { TonightHero } from "@/components/tonight/TonightHero";

const LOW_ENERGY_CATEGORIES = new Set([
  "fitness_wellness",
  "resort_activity",
  "nighttime_entertainment",
  "music",
  "nature",
  "arts_crafts",
  "arcade",
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
  return (
    <div className="night-card p-8 md:p-10">
      <EmptyState title={title} description={description} actions={actions} />
    </div>
  );
}

function filterVisible(activities: ActivityOccurrence[]): ActivityOccurrence[] {
  return activities.filter((a) => !shouldHideActivity(occurrenceToDisplayInput(a)));
}

export function TonightClient({
  activities,
  movieNights,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
}) {
  const { addActivity } = usePlan();
  const { setForceDaypart } = useDaypart();

  useEffect(() => {
    setForceDaypart("evening");
    return () => setForceDaypart(null);
  }, [setForceDaypart]);

  const visibleActivities = filterVisible(activities);
  const campfires = visibleActivities.filter((a) => a.category === "campfire");
  const lowEnergy = visibleActivities.filter(
    (a) => a.category !== "campfire" && LOW_ENERGY_CATEGORIES.has(a.category)
  );

  const tonightMovies = movieNights.filter((m) => m.isTonight);
  const weekMovies = movieNights.filter((m) => !m.isTonight);

  const hasAnyContent =
    movieNights.length > 0 || campfires.length > 0 || lowEnergy.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="space-y-8">
        <TonightHero />
        <NightSectionEmpty
          title="Tonight's schedule is still settling in"
          description="We haven't confirmed evening activities yet. Browse free resort fun, explore all activities, or check back after the next schedule update."
          actions={[
            { label: "Free activities", href: "/activities?free=true", variant: "primary" },
            { label: "Explore all", href: "/activities" },
            { label: "Browse resorts", href: "/resorts" },
            { label: "See today", href: "/today" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-8">
      <TonightHero />

      <section id="movies" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
            Movies under the stars
          </h2>
          <p className="mt-2 text-sm text-white/62 md:text-base">
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
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[var(--lantern)]">
                  Tonight
                </h3>
                <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {tonightMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            )}
            {weekMovies.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-white/55">
                  {tonightMovies.length > 0 ? "Rest of the week" : "This week"}
                </h3>
                <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {weekMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            )}
            <TmdbAttribution className="border-t border-white/12 pt-6 text-white/45" />
          </div>
        )}
      </section>

      <section id="campfires" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
            Campfires
          </h2>
          <p className="mt-2 text-sm text-white/62 md:text-base">
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
          <ul className="grid gap-4 md:grid-cols-2">
            {campfires.map((activity) => (
              <li key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="low-energy" className="scroll-mt-24">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
            Low-energy evening ideas
          </h2>
          <p className="mt-2 text-sm text-white/62 md:text-base">
            Cozy crafts, wellness, and easy resort moments when you want to wind down.
          </p>
        </div>

        {lowEnergy.length === 0 ? (
          <NightSectionEmpty
            title="No low-key evening picks right now"
            description="Try movies or campfires, or browse free activities happening across the resorts."
            actions={[
              { label: "Movies tonight", href: "#movies", variant: "primary" },
              { label: "Free activities", href: "/activities?free=true" },
              { label: "Browse resorts", href: "/resorts" },
            ]}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {lowEnergy.map((activity) => (
              <li key={activity.id}>
                <NightActivityCard activity={activity} onSave={addActivity} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
