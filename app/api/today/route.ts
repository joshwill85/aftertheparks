import { NextResponse } from "next/server";
import { getTodayActivities } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET() {
  const activities = await getTodayActivities();
  return NextResponse.json({ activities, count: activities.length });
}
