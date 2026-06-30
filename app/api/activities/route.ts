import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { publicCacheJson } from "@/lib/cache/http";
import { getFilteredActivities } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getFilteredOfficialOfferings,
} from "@/lib/data/officialOfferings";
import { parseBrowseParams } from "@/lib/explore/browseParams";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? Number(searchParams.get("limit"))
    : 500;
  const filters = { ...parseBrowseParams(searchParams), limit };
  const [activities, officialOfferingsPool] = await Promise.all([
    getFilteredActivities(filters),
    getFilteredOfficialOfferings(filters),
  ]);
  const officialOfferings = filterOfficialOfferingsWithoutActivityCollisions(
    officialOfferingsPool,
    activities
  );

  return publicCacheJson({
    ...publicActivitiesResponse(activities),
    officialOfferings,
    offeringCount: officialOfferings.length,
  }, "evergreen");
}
