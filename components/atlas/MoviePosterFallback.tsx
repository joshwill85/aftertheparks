function formatDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

interface MoviePosterFallbackProps {
  title: string;
  releaseYear?: number;
}

export function MoviePosterFallback({ title, releaseYear }: MoviePosterFallbackProps) {
  const initial = title.replace(/^["']|["']$/g, "").charAt(0).toUpperCase() || "M";

  return (
    <div className="movie-poster-fallback relative flex h-full w-full flex-col justify-end overflow-hidden p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 10%, rgba(247,185,85,0.35), transparent 45%),
            radial-gradient(circle at 80% 90%, rgba(27,140,148,0.25), transparent 50%)`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 movie-stars opacity-40" aria-hidden />
      <div className="relative">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xl font-bold text-[var(--color-lantern)] backdrop-blur-sm">
          {initial}
        </div>
        <p className="font-display text-lg font-semibold leading-snug text-white drop-shadow-sm">
          {title}
        </p>
        {releaseYear && (
          <p className="mt-1 text-sm text-white/60">{releaseYear}</p>
        )}
      </div>
    </div>
  );
}

export function formatMovieShowTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatMovieDay(day: string): string {
  return formatDay(day);
}
