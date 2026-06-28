import { MovieListingCard } from "@/components/movies/MovieListingCard";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

export { getMovieDisplayTitle } from "@/components/movies/MovieListingCard";

interface MovieCardProps {
  movie: Parameters<typeof MovieListingCard>[0]["movie"];
  weatherSummary?: WeatherForTimeSpan | null;
}

export function MovieCard({ movie, weatherSummary }: MovieCardProps) {
  return (
    <MovieListingCard
      movie={movie}
      variant="day"
      linkToTonight={false}
      weatherSummary={weatherSummary}
    />
  );
}
