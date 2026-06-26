import { NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { getFilteredActivities } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getFilteredOfficialOfferings,
} from "@/lib/data/officialOfferings";
import type { Daypart } from "@/lib/types/occurrence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resort = searchParams.get("resort") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const daypart = (searchParams.get("daypart") as Daypart) ?? undefined;
  const free = searchParams.get("free") === "true";
  const reservation = searchParams.get("reservation") === "true";
  const q = searchParams.get("q") ?? undefined;
  const limit = searchParams.get("limit")
    ? Number(searchParams.get("limit"))
    : undefined;

  const filters = {
    resort,
    category,
    daypart,
    free,
    reservation,
    q,
    limit,
  };
  const [activities, officialOfferingsPool] = await Promise.all([
    getFilteredActivities(filters),
    getFilteredOfficialOfferings(filters),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsPool,
    activities
  );

  return NextResponse.json({
    ...publicActivitiesResponse(activities),
    officialOfferings,
    offeringCount: officialOfferings.length,
  });
}
