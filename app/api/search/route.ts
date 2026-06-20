import { NextResponse } from "next/server";
import { searchActivities } from "@/lib/data/activities";
import type { Daypart } from "@/lib/types/occurrence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const resort = searchParams.get("resort") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const daypart = (searchParams.get("daypart") as Daypart) ?? undefined;

  const activities = await searchActivities(q, { resort, category, daypart });
  return NextResponse.json({ activities, count: activities.length, query: q });
}
