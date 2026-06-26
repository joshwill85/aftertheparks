/**
 * Legacy-only: warm the movie_poster_cache from movie_nights titles in Supabase.
 * Run only with ALLOW_LEGACY_ACTIVITY_UI_PIPELINE=1.
 */
import { createClient } from "@supabase/supabase-js";
import { isUsableMovieTitle, sanitizeMovieTitle } from "../lib/movies/sanitize";
import { resolveMoviePoster } from "../lib/movies/poster-cache";

async function main() {
  if (process.env.ALLOW_LEGACY_ACTIVITY_UI_PIPELINE !== "1") {
    throw new Error(
      "legacy_movie_poster_warm_disabled: film titles need a source-backed feed; set ALLOW_LEGACY_ACTIVITY_UI_PIPELINE=1 only for an intentional legacy movie_nights cache warm"
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars. Run with: tsx --env-file=.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("movie_nights")
    .select("movie_title")
    .gte("parse_confidence", 0.5);

  if (error) {
    console.error("Failed to load movie_nights:", error.message);
    process.exit(1);
  }

  const titles = [
    ...new Set(
      (data ?? [])
        .map((r) => sanitizeMovieTitle(r.movie_title))
        .filter((t) => isUsableMovieTitle(t))
    ),
  ];

  console.log(`Warming ${titles.length} unique movie titles…`);

  let found = 0;
  let missed = 0;

  for (const title of titles) {
    const meta = await resolveMoviePoster(title);
    if (meta.found) {
      found++;
      console.log(`✓ ${title}`);
    } else {
      missed++;
      console.log(`✗ ${title} (no poster)`);
    }
  }

  console.log(`\nDone: ${found} found, ${missed} not found, ${titles.length} total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
