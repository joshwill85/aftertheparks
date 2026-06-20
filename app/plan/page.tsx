import { PlanPageClient } from "@/components/atlas/PlanPageClient";
import { Hero } from "@/components/atlas/Hero";

export default function PlanPage() {
  return (
    <>
      <Hero
        title="My Plan"
        subtitle="Build your resort itinerary, share with travel companions, and export to your calendar."
      />
      <PlanPageClient />
    </>
  );
}
