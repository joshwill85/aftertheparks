import { TonightClient } from "@/components/atlas/TonightClient";
import { Hero } from "@/components/atlas/Hero";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function TonightPage() {
  const [activities, movieNights] = await Promise.all([
    getTonightActivities(),
    getMovieNights(),
  ]);

  return (
  <>
      <Hero
        title="Tonight"
        subtitle="Evening activities, campfires, and movies under the stars."
      />
      <TonightClient activities={activities} movieNights={movieNights} />
    </>
  );
}
