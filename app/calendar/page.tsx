import { CalendarClient } from "@/components/atlas/CalendarClient";
import { Hero } from "@/components/atlas/Hero";
import { sanitizePublicActivities, dedupeOccurrences } from "@/lib/api/publicActivities";
import { getAllOccurrences } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const occurrences = sanitizePublicActivities(
    dedupeOccurrences(await getAllOccurrences(31)),
    { minTier: "low" }
  );

  return (
    <>
      <Hero
        title="Calendar"
        subtitle="A month-at-a-glance view of resort activities across your stay."
      />
      <CalendarClient occurrences={occurrences} />
    </>
  );
}
