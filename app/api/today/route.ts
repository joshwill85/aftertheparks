import { NextRequest } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { publicCacheJson } from "@/lib/cache/http";
import { getTodayActivities } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";

export async function GET(request: NextRequest) {
  const filters = parseBrowseParams(request.nextUrl.searchParams);
  const activities = await getTodayActivities(filters);
  return publicCacheJson(publicActivitiesResponse(activities), "timeRelative");
}
