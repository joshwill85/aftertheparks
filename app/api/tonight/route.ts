import { NextRequest, NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";
import {
  filterMovieNights,
  parseBrowseParams,
} from "@/lib/explore/browseParams";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const filters = parseBrowseParams(request.nextUrl.searchParams);
  const [activities, movieNights] = await Promise.all([
    getTonightActivities(filters),
    getMovieNights(),
  ]);

  const filteredMovies = filterMovieNights(movieNights, filters);
  const { activities: sanitized, count } = publicActivitiesResponse(activities);

  return NextResponse.json({
    activities: sanitized,
    movieNights: filteredMovies,
    count,
    movieCount: filteredMovies.length,
  });
}
