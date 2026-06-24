import { NextRequest, NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { getTodayActivities } from "@/lib/data/activities";
import { parseBrowseParams } from "@/lib/explore/browseParams";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const filters = parseBrowseParams(request.nextUrl.searchParams);
  const activities = await getTodayActivities(filters);
  return NextResponse.json(publicActivitiesResponse(activities));
}
