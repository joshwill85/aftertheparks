import { NextRequest } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { publicCacheJson } from "@/lib/cache/http";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";
import {
  filterMovieNights,
  parseBrowseParams,
} from "@/lib/explore/browseParams";
import {
  getVisibleTonightActivities,
  getVisibleTonightMovieNights,
  normalizeTonightFilters,
} from "@/lib/tonight/visibleResults";

export async function GET(request: NextRequest) {
  const filters = normalizeTonightFilters(
    parseBrowseParams(request.nextUrl.searchParams)
  );
  const [activities, movieNights] = await Promise.all([
    getTonightActivities(filters),
    getMovieNights(),
  ]);

  const filteredMovies = getVisibleTonightMovieNights(
    filterMovieNights(movieNights, filters)
  );
  const { activities: sanitized, count } = publicActivitiesResponse(
    getVisibleTonightActivities(activities)
  );

  return publicCacheJson({
    activities: sanitized,
    movieNights: filteredMovies,
    count,
    movieCount: filteredMovies.length,
  }, "timeRelative");
}
