import { TonightClient } from "@/components/atlas/TonightClient";
import { getTonightActivities, getMovieNights } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export default async function TonightPage({
  searchParams,
}: {
  searchParams: Promise<{ resort?: string }>;
}) {
  const { resort } = await searchParams;
  const [activities, movieNights] = await Promise.all([
    getTonightActivities({ resort }),
    getMovieNights(),
  ]);

  const filteredMovies = resort
    ? movieNights.filter((m) => m.resortSlug === resort)
    : movieNights;

  return (
    <div className="tonight-page -mx-4 -mt-8 min-h-[calc(100vh-72px)] px-4 py-8 pb-24 md:pb-8">
      <TonightClient activities={activities} movieNights={filteredMovies} />
    </div>
  );
}
