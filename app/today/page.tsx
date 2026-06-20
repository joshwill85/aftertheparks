import { TodayClient } from "@/components/atlas/TodayClient";
import { Hero } from "@/components/atlas/Hero";
import { getTodayActivities } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const activities = await getTodayActivities();

  return (
    <>
      <Hero
        title="Today"
        subtitle="What's still ahead for the rest of your resort day — sorted by time."
      />
      <TodayClient initialActivities={activities} />
    </>
  );
}
