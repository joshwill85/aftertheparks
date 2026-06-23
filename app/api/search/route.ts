import { NextResponse } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { runSearch } from "@/lib/search/runSearch";
import type { Daypart } from "@/lib/types/occurrence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const resort = searchParams.get("resort") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const daypart = (searchParams.get("daypart") as Daypart) ?? undefined;
  const free = searchParams.get("free") === "true";

  const result = await runSearch(q, { resort, category, daypart, free });

  return NextResponse.json({
    ...publicActivitiesResponse(result.activities),
    query: result.query,
    tokens: result.tokens,
    total: result.total,
    topHits: result.topHits,
    officialOfferings: result.officialOfferings,
    offeringCount: result.officialOfferings.length,
    resorts: result.resorts,
    guides: result.guides,
    movies: result.movies,
    categories: result.categories,
    pages: result.pages,
  });
}
