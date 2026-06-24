import { Suspense } from "react";
import { TonightClient } from "@/components/atlas/TonightClient";
import { ActivityGridSkeleton } from "@/components/atlas/Skeleton";
import { BrowseFilterShell } from "@/components/explore/BrowseFilterShell";
import { getTonightActivities, getMovieNights, getResorts } from "@/lib/data/activities";
import {
  filterMovieNights,
  hasActiveBrowseFilters,
  parseBrowseParams,
} from "@/lib/explore/browseParams";

export const dynamic = "force-dynamic";

export default async function TonightPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const [activities, movieNights, resorts] = await Promise.all([
    getTonightActivities(filters),
    getMovieNights(),
    getResorts(),
  ]);

  const filteredMovies = filterMovieNights(movieNights, filters);
  const filteredMode = hasActiveBrowseFilters(filters);
  const resultCount = activities.length + filteredMovies.length;

  return (
    <div className="tonight-page -mx-4 -mt-8 min-h-[calc(100vh-72px)] px-4 py-8 pb-24 md:pb-8">
      <Suspense fallback={<ActivityGridSkeleton columns={2} />}>
        <BrowseFilterShell
          variant="tonight"
          resorts={resorts.map((r) => ({ slug: r.slug, name: r.name }))}
          resultCount={resultCount}
        >
          <TonightClient
            activities={activities}
            movieNights={filteredMovies}
            filteredMode={filteredMode}
          />
        </BrowseFilterShell>
      </Suspense>
    </div>
  );
}
