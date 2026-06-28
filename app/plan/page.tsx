import type { Metadata } from "next";
import { PlanPageClient } from "@/components/atlas/PlanPageClient";
import { Hero } from "@/components/atlas/Hero";
import { getResorts } from "@/lib/data/activities";

export const metadata: Metadata = {
  title: "My Plan | After the Parks",
  description:
    "Private After the Parks resort-day planning workspace for saved activities and shared trip ideas.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/plan" },
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
      <PlanPageClient resorts={resortOptions} />
    </>
  );
}
