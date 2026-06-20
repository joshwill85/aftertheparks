import { NextResponse } from "next/server";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET() {
  const [activities, movieNights] = await Promise.all([
    getTonightActivities(),
    getMovieNights(),
  ]);

  return NextResponse.json({
    activities,
    movieNights,
    count: activities.length,
    movieCount: movieNights.length,
  });
}
