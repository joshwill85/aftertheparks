import type { Metadata } from "next";
import { PlanPageClient } from "@/components/atlas/PlanPageClient";
import { Hero } from "@/components/atlas/Hero";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { getFilteredActivities, getResorts } from "@/lib/data/activities";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Plan",
  description:
    "Save activities and build one easy resort-day plan.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/plan" },
  ...buildSocialMetadata({
    title: "After the Parks",
    description:
      "Find movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas.",
    path: "/plan",
    imageSummary:
      "Movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas in one beautiful guide.",
  }),
};

export default async function PlanPage() {
  const [resorts, backupCandidates] = await Promise.all([
    getResorts(),
    getFilteredActivities({ preset: "rain_backup", limit: 60 }),
  ]);
  const resortOptions = resorts.map((resort) => ({
    slug: resort.slug,
    name: resort.name,
  }));

  return (
    <>
      <Hero
        title="My Plan"
        subtitle="Save activities and build one easy resort-day plan."
      />
      <section className="mb-8 grid gap-5 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            Saved activities
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            Build one easy resort-day plan.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Add your resort and trip dates. Then save movies, campfires, crafts, meals, pool breaks, and backups in one place.
          </p>
        </div>
        <BrandAsset
          asset="pocket-map-only"
          className="brand-asset--map-panel justify-self-center"
          priority
        />
      </section>
      <PlanClientBoundary syncOnMount>
        <PlanPageClient resorts={resortOptions} backupCandidates={backupCandidates} />
      </PlanClientBoundary>
    </>
  );
}
