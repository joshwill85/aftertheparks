import { publicCacheJson } from "@/lib/cache/http";
import { getResorts } from "@/lib/data/activities";

export async function GET() {
  const resorts = await getResorts();
  return publicCacheJson({
    resorts,
    count: resorts.length,
    offeringCount: resorts.reduce(
      (sum, resort) => sum + resort.offeringCount,
      0
    ),
  }, "evergreen");
}
