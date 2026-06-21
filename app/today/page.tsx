import { TodayClient } from "@/components/atlas/TodayClient";
import { Hero } from "@/components/atlas/Hero";
import { getTodayActivities, getTomorrowPreview } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ resort?: string }>;
}) {
  const { resort } = await searchParams;
  const [activities, tomorrowPreview] = await Promise.all([
    getTodayActivities({ resort }),
    getTomorrowPreview({ resort }),
  ]);

  return (
    <>
      <Hero
        title="Today"
        subtitle="What's still ahead for the rest of your resort day — sorted by time."
      />
      <TodayClient
        initialActivities={activities}
        tomorrowPreview={tomorrowPreview}
      />
    </>
  );
}
