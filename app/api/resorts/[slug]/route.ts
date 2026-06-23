import { NextResponse } from "next/server";
import { getResortBySlug, getResortActivities } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getOfficialOfferingsForResort,
} from "@/lib/data/officialOfferings";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [resort, activities, officialOfferingsForResort] = await Promise.all([
    getResortBySlug(slug),
    getResortActivities(slug),
    getOfficialOfferingsForResort(slug),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsForResort,
    activities
  );

  if (!resort) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    resort,
    activities,
    officialOfferings,
    count: activities.length,
    offeringCount: officialOfferings.length,
  });
}
