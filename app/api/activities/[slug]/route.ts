import { NextResponse } from "next/server";
import {
  ensurePublicActivity,
  sanitizePublicActivities,
} from "@/lib/api/publicActivities";
import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import { publicCacheJson } from "@/lib/cache/http";
import { getActivityBySlug } from "@/lib/data/activities";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const canonicalSlug = canonicalActivitySlug(slug);
  const url = new URL(request.url);
  const resort = url.searchParams.get("resort") ?? undefined;

  if (canonicalSlug !== slug) {
    url.pathname = `/api/activities/${canonicalSlug}`;
    return NextResponse.redirect(url, 308);
  }

  const result = await getActivityBySlug(canonicalSlug, { resort });

  if (!result) {
    return publicCacheJson({ error: "Not found" }, "evergreen", { status: 404 });
  }

  return publicCacheJson({
    activity: ensurePublicActivity(result.activity),
    upcoming: sanitizePublicActivities(result.upcoming),
  }, "evergreen");
}
