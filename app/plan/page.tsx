import { PlanPageClient } from "@/components/atlas/PlanPageClient";
import { Hero } from "@/components/atlas/Hero";

export default function PlanPage() {
  return (
    <>
      <Hero
        title="My Plan"
        subtitle="Line up pool breaks, campfires, and movie nights into one easy rest day."
      />
      <PlanPageClient />
    </>
  );
}
