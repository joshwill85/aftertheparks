import { publicCacheJson } from "@/lib/cache/http";
import { guardRateLimit } from "@/lib/rate-limit/guard";
import { runSearchSuggest } from "@/lib/search/runSearch";
import type { Daypart } from "@/lib/types/occurrence";

export async function GET(request: Request) {
  const limited = await guardRateLimit({
    request,
    scope: "search",
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const resort = searchParams.get("resort") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const daypart = (searchParams.get("daypart") as Daypart) ?? undefined;
  const free = searchParams.get("free") === "true";
  const reservation = searchParams.get("reservation") === "true";
  const limit = Number(searchParams.get("limit") ?? 8);

  const result = await runSearchSuggest(q, {
    resort,
    category,
    daypart,
    free,
    reservation,
    limit: Number.isFinite(limit) ? limit : 8,
  });

  return publicCacheJson({
    query: result.query,
    tokens: result.tokens,
    total: result.total,
    hits: result.hits ?? [],
    topHits: result.topHits,
    facets: result.facets ?? [],
    suggestions: result.suggestedQueries ?? [],
    suggestedQueries: result.suggestedQueries ?? [],
  }, "timeRelative");
}
