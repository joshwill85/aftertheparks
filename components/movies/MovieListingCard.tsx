import { EventCard } from "@/components/events/EventCard";
import { getMovieDisplayTitle, movieToEventCard } from "@/lib/events/mapToEventCard";
import type { MovieNightOccurrence } from "@/lib/types/occurrence";

export { getMovieDisplayTitle };

interface MovieListingCardProps {
  movie: MovieNightOccurrence;
  variant?: "day" | "night";
  linkToTonight?: boolean;
  className?: string;
}

export function MovieListingCard({
  movie,
  variant = "day",
  linkToTonight = true,
  className,
}: MovieListingCardProps) {
  const card = movieToEventCard(movie, variant, { linkToTonight });

  return <EventCard {...card} className={className} />;
}
