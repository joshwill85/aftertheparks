import { NextRequest, NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { getTodayActivities } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const resort = request.nextUrl.searchParams.get("resort") ?? undefined;
  const activities = await getTodayActivities({ resort });
  return NextResponse.json(publicActivitiesResponse(activities));
}
