import { NextResponse } from "next/server";
import {
  ensurePublicActivity,
  sanitizePublicActivities,
} from "@/lib/api/publicActivities";
import { getActivityBySlug } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = await getActivityBySlug(slug);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    activity: ensurePublicActivity(result.activity),
    upcoming: sanitizePublicActivities(result.upcoming),
  });
}
