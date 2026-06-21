import { TMDB_ATTRIBUTION_URL } from "@/lib/movies/tmdb";

export function TmdbAttribution({ className = "" }: { className?: string }) {
  return (
      <p className={`text-xs leading-relaxed ${className}`}>
      Movie posters and metadata from{" "}
      <a
        href={TMDB_ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline decoration-white/25 underline-offset-2 hover:decoration-[var(--lantern)]"
      >
        The Movie Database (TMDB)
      </a>
      . This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
  );
}
