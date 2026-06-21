import { Hero } from "@/components/atlas/Hero";
import { ResortGrid } from "@/components/resort/ResortGrid";
import {
  getResorts,
  getTodayActivities,
  getTonightActivities,
} from "@/lib/data/activities";
import {
  buildResortEnrichment,
} from "@/lib/resorts/enrichment";

export const dynamic = "force-dynamic";

function mapsToRecords<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map.entries());
}

export default async function ResortsPage() {
  const [resorts, tonightActivities, todayActivities] = await Promise.all([
    getResorts(),
    getTonightActivities(),
    getTodayActivities(),
  ]);

  const enrichment = buildResortEnrichment(todayActivities, tonightActivities);

  return (
    <>
      <Hero
        title="Resorts"
        subtitle="All 31 Disney-owned and operated Walt Disney World resort hotels — filter by tier, area, or what's happening today."
      />
      <section className="resorts-page" aria-label="Resort directory">
        <ResortGrid
          resorts={resorts}
          todayByResort={mapsToRecords(enrichment.todayByResort)}
          tonightByResort={mapsToRecords(enrichment.tonightByResort)}
          highlightsByResort={mapsToRecords(enrichment.highlightsByResort)}
        />
      </section>
    </>
  );
}
