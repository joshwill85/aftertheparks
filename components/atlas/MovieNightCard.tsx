import { MovieListingCard } from "@/components/movies/MovieListingCard";

export { getMovieDisplayTitle } from "@/components/movies/MovieListingCard";

export function MovieNightCard({
  movie,
}: {
  movie: Parameters<typeof MovieListingCard>[0]["movie"];
}) {
  return <MovieListingCard movie={movie} variant="day" />;
}
