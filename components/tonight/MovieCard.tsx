import { MovieListingCard } from "@/components/movies/MovieListingCard";

export { getMovieDisplayTitle } from "@/components/movies/MovieListingCard";

interface MovieCardProps {
  movie: Parameters<typeof MovieListingCard>[0]["movie"];
}

export function MovieCard({ movie }: MovieCardProps) {
  return <MovieListingCard movie={movie} variant="day" linkToTonight={false} />;
}
