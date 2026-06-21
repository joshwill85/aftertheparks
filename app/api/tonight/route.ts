import { NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET() {
  const [activities, movieNights] = await Promise.all([
    getTonightActivities(),
    getMovieNights(),
  ]);

  const { activities: sanitized, count } = publicActivitiesResponse(activities);

  return NextResponse.json({
    activities: sanitized,
    movieNights,
    count,
    movieCount: movieNights.length,
  });
}
