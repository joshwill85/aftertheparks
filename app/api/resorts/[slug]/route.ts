import { publicCacheJson } from "@/lib/cache/http";
import { getResortBySlug, getResortActivities } from "@/lib/data/activities";
import {
  filterOfficialOfferingsWithoutActivityCollisions,
  getOfficialOfferingsForResort,
} from "@/lib/data/officialOfferings";

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
    return publicCacheJson({ error: "Not found" }, "evergreen", { status: 404 });
  }

  return publicCacheJson({
    resort,
    activities,
    officialOfferings,
    count: activities.length,
    offeringCount: officialOfferings.length,
  }, "evergreen");
}
