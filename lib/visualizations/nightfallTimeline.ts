import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import { getCategoryMeta } from "@/lib/categories/meta";
import { TIMEZONE } from "@/lib/daypart";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";

export type NightfallTimelineKind = "activity" | "movie";
export type NightfallTimelineStatus =
  | "happening_now"
  | "next_showing"
  | "later_tonight"
  | "last_call";

export interface NightfallTimelineItem {
  id: string;
  kind: NightfallTimelineKind;
  title: string;
  resortName: string;
  categoryLabel: string;
  timeLabel: string;
  minutes: number;
  positionPct: number;
  status: NightfallTimelineStatus;
  href?: string;
}

export interface NightfallTimeline {
  items: NightfallTimelineItem[];
  summary: string;
  ariaLabel: string;
}

const START_MINUTES = 17 * 60;
const END_MINUTES = 23 * 60;
const RANGE_MINUTES = END_MINUTES - START_MINUTES;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatMinutes(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function minutesFromIso(iso: string): number {
  const hour = Number(formatInTimeZone(parseISO(iso), TIMEZONE, "H"));
  const minute = Number(formatInTimeZone(parseISO(iso), TIMEZONE, "m"));
  return hour * 60 + minute;
}

export function parseTonightMovieMinutes(showTime: string): number | undefined {
  const match = showTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return undefined;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function positionFor(minutes: number): number {
  return Math.round(clamp(((minutes - START_MINUTES) / RANGE_MINUTES) * 100, 14, 86));
}

function statusFor(minutes: number, nowMinutes: number): NightfallTimelineStatus {
  if (minutes <= nowMinutes && nowMinutes - minutes <= 75) return "happening_now";
  if (minutes > nowMinutes && minutes - nowMinutes <= 75) return "next_showing";
  if (minutes >= 22 * 60) return "last_call";
  return "later_tonight";
}

function activityHref(activity: ActivityOccurrence): string {
  return `/activities/${activity.activitySlug}?resort=${activity.resort.slug}`;
}

function groupStoryStops(items: NightfallTimelineItem[]): NightfallTimelineItem[] {
  const groups = new Map<string, NightfallTimelineItem[]>();
  for (const item of items) {
    const key =
      item.kind === "activity"
        ? `${item.minutes}:${item.kind}:${item.categoryLabel.toLowerCase()}`
        : `${item.minutes}:${item.kind}:${item.title.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.values()).map((group) => {
    const [first] = group;
    if (group.length === 1) return first;
    const uniqueTitles = new Set(group.map((item) => item.title));
    const title =
      uniqueTitles.size === 1 ? first.title : `${first.categoryLabel} options`;
    const resortName =
      uniqueTitles.size === 1
        ? `${first.resortName} + ${group.length - 1} more`
        : `${group.length} resorts`;
    return {
      ...first,
      title,
      resortName,
    };
  });
}

function selectSpreadStops(
  items: NightfallTimelineItem[],
  limit: number
): NightfallTimelineItem[] {
  const selected: NightfallTimelineItem[] = [];
  const usedHourBuckets = new Set<number>();
  const sorted = [...items].sort(
    (a, b) => a.minutes - b.minutes || a.title.localeCompare(b.title)
  );

  for (const item of sorted) {
    const bucket = Math.floor((item.minutes - START_MINUTES) / 60);
    if (usedHourBuckets.has(bucket)) continue;
    selected.push(item);
    usedHourBuckets.add(bucket);
    if (selected.length >= limit) return selected;
  }

  return selected;
}

export function buildNightfallTimeline({
  activities,
  movies,
  nowMinutes,
  limit = 8,
}: {
  activities: ActivityOccurrence[];
  movies: MovieNightOccurrence[];
  nowMinutes?: number;
  limit?: number;
}): NightfallTimeline {
  const effectiveNow =
    nowMinutes ??
    Number(formatInTimeZone(new Date(), TIMEZONE, "H")) * 60 +
      Number(formatInTimeZone(new Date(), TIMEZONE, "m"));

  const activityItems: NightfallTimelineItem[] = activities
    .filter((activity) => activity.startDateTime)
    .map((activity) => {
      const minutes = minutesFromIso(activity.startDateTime!);
      return {
        id: `activity:${activity.id}`,
        kind: "activity" as const,
        title: activity.title,
        resortName: activity.resort.name,
        categoryLabel: getCategoryMeta(activity.category).label,
        timeLabel: formatMinutes(minutes),
        minutes,
        positionPct: positionFor(minutes),
        status: statusFor(minutes, effectiveNow),
        href: activityHref(activity),
      };
    })
    .filter((item) => item.minutes >= START_MINUTES && item.minutes <= END_MINUTES);

  const movieItems: NightfallTimelineItem[] = movies
    .filter((movie) => movie.isTonight)
    .flatMap((movie) => {
      const minutes = parseTonightMovieMinutes(movie.showTime);
      if (minutes == null || minutes < START_MINUTES || minutes > END_MINUTES) {
        return [];
      }
      return [{
        id: `movie:${movie.id}`,
        kind: "movie" as const,
        title: movie.displayTitle || movie.movieTitle || "Movie Under the Stars",
        resortName: movie.resortName,
        categoryLabel: "Movie",
        timeLabel: formatMinutes(minutes),
        minutes,
        positionPct: positionFor(minutes),
        status: statusFor(minutes, effectiveNow),
        href: "/tonight#movies",
      } satisfies NightfallTimelineItem];
    });

  const items = selectSpreadStops(
    groupStoryStops([...activityItems, ...movieItems]),
    limit
  );

  const summary =
    items.length === 0
      ? "No timed evening stops are ready for the Nightfall Timeline."
      : `${items.length} evening ${items.length === 1 ? "stop" : "stops"} from ${
          items[0].timeLabel
        } through ${items[items.length - 1].timeLabel}.`;

  const ariaLabel =
    items.length === 0
      ? summary
      : `${items.length} timeline stops: ${items
          .map((item) => `${item.title} at ${item.timeLabel}, ${item.resortName}`)
          .join("; ")}.`;

  return { items, summary, ariaLabel };
}

export const NIGHTFALL_TIMELINE_BOUNDS = {
  startMinutes: START_MINUTES,
  endMinutes: END_MINUTES,
};
