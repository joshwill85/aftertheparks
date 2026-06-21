import { TMDB_ATTRIBUTION_URL } from "@/lib/movies/tmdb";

export function TmdbAttribution({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-[var(--color-muted)] ${className}`}>
      Movie posters and metadata from{" "}
      <a
        href={TMDB_ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-[var(--color-card-border)] underline-offset-2 hover:text-[var(--accent)]"
      >
        The Movie Database (TMDB)
      </a>
      . This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
  );
}
