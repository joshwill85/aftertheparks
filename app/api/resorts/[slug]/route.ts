import { NextResponse } from "next/server";
import { getResortBySlug, getResortActivities } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [resort, activities] = await Promise.all([
    getResortBySlug(slug),
    getResortActivities(slug),
  ]);

  if (!resort) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ resort, activities, count: activities.length });
}
