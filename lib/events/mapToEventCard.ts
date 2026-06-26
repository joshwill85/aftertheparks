import { looksCorruptedTitle } from "@/lib/activityDisplay";
import type { DisplayActivity } from "@/lib/displayActivity";
import type { ActivityOccurrence, MovieNightOccurrence } from "@/lib/types/occurrence";
import type { EventBadge, EventCardProps } from "@/components/events/EventCard";
import { formatActivityEventDay, formatMovieEventDay } from "@/lib/events/formatEventDay";
import { formatMovieShowTime } from "@/components/atlas/MoviePosterFallback";
import { activityDetailHref } from "@/lib/activities/links";

const DAYPART_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  late: "Starlight",
  anytime: "Anytime",
  unclear: "Time unclear",
};

const MOVIE_FALLBACK_TITLE = "Movie Under the Stars";

export function getMovieDisplayTitle(movie: MovieNightOccurrence): string {
  const candidate = (movie.displayTitle ?? movie.movieTitle ?? "").trim();
  if (!candidate || looksCorruptedTitle(candidate)) {
    return MOVIE_FALLBACK_TITLE;
  }
  return candidate;
}

function priceBadgeTone(label: string): EventBadge["tone"] {
  if (label === "Free") return "free";
  if (label === "Paid") return "paid";
  return "muted";
}

export function activityToEventCard(
  activity: ActivityOccurrence,
  display: DisplayActivity,
  options: {
    showResort?: boolean;
    variant?: "day" | "night";
    includeScheduleDate?: boolean;
  } = {}
): Omit<EventCardProps, "saved" | "onSave"> {
  const { showResort = true, variant = "day", includeScheduleDate = false } =
    options;

  const scheduleDay = formatActivityEventDay(display.startDateTime, {
    includeDate: includeScheduleDate,
  });

  const badges: EventBadge[] = [
    { label: display.costLabel, tone: priceBadgeTone(display.costLabel) },
  ];

  if (display.isHappeningNow) {
    badges.push({ label: "Now", tone: "now" });
  }

  if (display.daypart !== "anytime") {
    badges.push({
      label: DAYPART_LABELS[display.daypart] ?? display.daypart,
      tone: "muted",
    });
  }

  if (display.timeUncertain) {
    badges.push({ label: "Confirm time", tone: "warning" });
  }

  const location =
    display.locationLabel !== "Resort" &&
    display.locationLabel !== display.resortName
      ? display.locationLabel
      : undefined;

  return {
    variant,
    href: activityDetailHref(display.activitySlug, display.resortSlug),
    title: display.title,
    resort: showResort ? display.resortName : "",
    location,
    timeLabel: display.timeLabel,
    timeDateTime: display.startDateTime,
    timeUncertain: display.timeUncertain,
    scheduleDayLabel: scheduleDay.label,
    scheduleDayDateTime: scheduleDay.dateTime,
    summary: display.summary,
    badges,
    media: { kind: "category", category: display.category },
    isHappeningNow: display.isHappeningNow,
    showTrust:
      display.trustState !== "verified" &&
      display.trustState !== "recently_updated" &&
      !display.timeUncertain,
    trustActivity: activity,
  };
}

export function movieToEventCard(
  movie: MovieNightOccurrence,
  variant: "day" | "night" = "day",
  options: { linkToTonight?: boolean } = {}
): Omit<EventCardProps, "saved" | "onSave"> {
  const { linkToTonight = true } = options;
  const title = getMovieDisplayTitle(movie);
  const showTime = formatMovieShowTime(movie.showTime);
  const scheduleDay = formatMovieEventDay(movie);

  const badges: EventBadge[] = movie.isTonight
    ? [{ label: "Tonight", tone: "tonight" }]
    : [];

  badges.push({ label: showTime, tone: "muted" });

  return {
    variant,
    href: linkToTonight ? "/tonight" : undefined,
    title,
    resort: movie.resortName,
    location: movie.location,
    extra: movie.releaseYear && title !== MOVIE_FALLBACK_TITLE
      ? String(movie.releaseYear)
      : undefined,
    timeLabel: showTime,
    scheduleDayLabel: scheduleDay.label,
    scheduleDayDateTime: scheduleDay.dateTime,
    footnote: "Confirm showtime with the resort before heading over.",
    badges,
    media: movie.posterUrl
      ? { kind: "poster", src: movie.posterUrl, alt: `${title} poster` }
      : {
          kind: "initial",
          letter: title.replace(/^["']|["']$/g, "").charAt(0).toUpperCase() || "M",
          category: "movies_under_stars",
        },
  };
}
