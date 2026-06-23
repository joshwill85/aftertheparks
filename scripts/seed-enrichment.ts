/**
 * Seed activity_enrichment summaries from ingest JSON.
 * Run: npm run seed:enrichment (requires SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const ingestPath = join(process.cwd(), "data/processed/activities_ingest.json");
  const ingest = JSON.parse(readFileSync(ingestPath, "utf-8"));

  let updated = 0;
  const activities: Array<{
    normalized_name: string;
    name: string;
    category: string;
    location?: string | null;
    is_fee_based?: boolean;
    confidence?: number;
    warnings?: string[];
  }> = ingest.activities ?? [];

  for (const activity of activities) {
    const normalized = activity.normalized_name;
    if (!normalized) continue;

    const { data: catalog } = await supabase
      .from("activity_catalog")
      .select("id")
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (!catalog?.id) continue;

    const needsReview =
      (activity.confidence ?? 1) < 0.5 ||
      (activity.warnings?.length ?? 0) > 2;

    const { error } = await supabase.from("activity_enrichment").upsert(
      {
        activity_catalog_id: catalog.id,
        verification_last_checked: new Date().toISOString(),
        status: needsReview ? "needs_review" : "active",
        price_state: activity.is_fee_based ? "fee" : "unknown",
      },
      { onConflict: "activity_catalog_id" }
    );

    if (!error) updated++;
  }

  console.log(`Enrichment seed complete: ${updated} rows touched`);
}

main().catch(console.error);
