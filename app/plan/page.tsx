import type { Metadata } from "next";
import { PlanPageClient } from "@/components/atlas/PlanPageClient";
import { Hero } from "@/components/atlas/Hero";
import { BrandAsset } from "@/components/brand/BrandAsset";
import { getResorts } from "@/lib/data/activities";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "My Plan",
  description:
    "Private After the Parks resort-day planning workspace for saved activities and shared trip ideas.",
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
  const resorts = await getResorts();
  const resortOptions = resorts.map((resort) => ({
    slug: resort.slug,
    name: resort.name,
  }));

  return (
    <>
      <Hero
        title="My Plan"
        subtitle="Line up pool breaks, campfires, and movie nights into one easy rest day."
      />
      <section className="mb-8 grid gap-5 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            Pocket map companion
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            Turn loose ideas into a low-stress route.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Save the moments worth keeping, then use My Plan like a little resort
            map for pool breaks, dinner gaps, campfires, and starlight wins.
          </p>
        </div>
        <BrandAsset
          asset="pocket-map-only"
          className="brand-asset--map-panel justify-self-center"
        />
      </section>
      <PlanPageClient resorts={resortOptions} />
    </>
  );
}
