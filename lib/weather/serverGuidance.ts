import { addHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";
import { buildWeatherGuidanceForTimeSpan } from "@/lib/weather/guidance";
import {
  getWeatherLocation,
  getWeatherLocationForResort,
  parseWeatherLocationKey,
} from "@/lib/weather/locations";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";
import {
  chooseWeatherProviderForTimeSpan,
  groupOccurrencesByWeatherLocation,
  type WeatherGuidanceBatchOccurrence,
} from "@/lib/weather/providerRouter";
import {
  toWeatherLocationTime,
  WEATHER_TIMEZONE,
} from "@/lib/weather/time";
import type {
  ActivityWeatherFit,
  OfficialAlertStatus,
  WeatherAlert,
  WeatherForTimeSpan,
  WeatherLocation,
  WeatherLocationKey,
  WeatherPrecipMapContext,
  WeatherProviderId,
  WeatherSnapshot,
  WeatherTimeBasis,
} from "@/lib/weather/types";

type LoadWeatherGuidanceForLocationInput = {
  location?: WeatherLocation;
  locationKey?: WeatherLocationKey;
  resortSlug?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  now?: Date;
  includeNearTerm?: boolean;
  includePrecipMap?: boolean;
  timeBasis?: WeatherTimeBasis;
  timeBasisLabel?: string;
  activityWeatherFits?: ActivityWeatherFit[];
};

type LoadWeatherByOccurrenceInput = {
  occurrences: WeatherGuidanceBatchOccurrence[];
  now?: Date;
  includeNearTerm?: boolean;
  includePrecipMap?: boolean;
};

function orlandoDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WEATHER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function orlandoWallTime(dateKey: string, hour: number): Date {
  return fromZonedTime(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00`,
    WEATHER_TIMEZONE
  );
}

function asWeatherTime(value: string | Date): string {
  return value instanceof Date ? toWeatherLocationTime(value) : value;
}

function textForActivity(activity: ActivityOccurrence): string {
  return [
    activity.title,
    activity.activitySlug,
    activity.category,
    activity.section,
    activity.scheduleText,
    activity.location?.label,
    activity.enrichment?.weatherDependency,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function flexibleWindow(
  now: Date,
  startHour: number,
  endHour: number,
  activeDurationHours: number
): { startsAt: string; endsAt: string } {
  const dateKey = orlandoDateKey(now);
  const start = orlandoWallTime(dateKey, startHour);
  const end = orlandoWallTime(dateKey, endHour);
  const current = now.getTime();

  if (current >= start.getTime() && current <= end.getTime()) {
    return {
      startsAt: toWeatherLocationTime(now),
      endsAt: toWeatherLocationTime(addHours(now, activeDurationHours)),
    };
  }

  return {
    startsAt: toWeatherLocationTime(start),
    endsAt: toWeatherLocationTime(end),
  };
}

function isPoolside(activity: ActivityOccurrence): boolean {
  return /pool|poolside|aquatic|swim/.test(textForActivity(activity));
}

function isWalkingHeavy(activity: ActivityOccurrence): boolean {
  return /nature walk|walk|walking|trail|jog|run|scavenger|hunt/.test(
    textForActivity(activity)
  );
}

function isGenericEveningOutdoor(activity: ActivityOccurrence): boolean {
  return /nightly|movie|under the stars|campfire/.test(textForActivity(activity));
}

export function weatherQueryForActivity(
  activity: ActivityOccurrence,
  now = new Date()
): WeatherGuidanceBatchOccurrence | null {
  if (activity.startDateTime) {
    return {
      id: activity.id,
      resortSlug: activity.resort.slug,
      startsAt: activity.startDateTime,
      endsAt: activity.endDateTime,
      activitySlug: activity.activitySlug,
      timeBasis: "exact_event_time",
      timeBasisLabel: "Exact event time",
    };
  }

  let window: { startsAt: string; endsAt: string } | null = null;
  let timeBasisLabel: string | undefined;

  if (isGenericEveningOutdoor(activity)) {
    window = flexibleWindow(now, 19, 22, 3);
    timeBasisLabel = "Typical evening window; confirm showtime";
  } else if (isPoolside(activity)) {
    window = flexibleWindow(now, 12, 16, 4);
    timeBasisLabel = "Pool-area weather window";
  } else if (isWalkingHeavy(activity)) {
    window = flexibleWindow(now, 9, 17, 3);
    timeBasisLabel = "Flexible outdoor window";
  }

  if (!window || !timeBasisLabel) return null;

  return {
    id: activity.id,
    resortSlug: activity.resort.slug,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    activitySlug: activity.activitySlug,
    timeBasis: "flexible_activity_window",
    timeBasisLabel,
  };
}

export function weatherQueryForMovie(
  movie: MovieNightOccurrence
): WeatherGuidanceBatchOccurrence | null {
  if (!movie.startDateTime) return null;
  return {
    id: movie.id,
    resortSlug: movie.resortSlug,
    startsAt: movie.startDateTime,
    endsAt: movie.endDateTime,
    activitySlug: "movie-under-the-stars",
    timeBasis: "exact_event_time",
    timeBasisLabel: "Exact movie showtime",
  };
}

async function loadWeatherCache() {
  return import("@/lib/weather/cache");
}

function resolveLocation(input: LoadWeatherGuidanceForLocationInput): WeatherLocation {
  if (input.location) return input.location;
  if (input.locationKey) return getWeatherLocation(input.locationKey);
  return getWeatherLocationForResort(input.resortSlug);
}

async function loadSnapshotAndAlerts(input: {
  location: WeatherLocation;
  provider: WeatherProviderId;
}): Promise<{
  snapshot: WeatherSnapshot | null;
  alerts: WeatherAlert[];
  officialAlertStatus: OfficialAlertStatus;
}> {
  const {
    getCachedNwsAlerts,
    getCachedNwsAlertsForAllWdw,
    getCachedWeatherSnapshot,
  } = await loadWeatherCache();
  const [snapshotResult, alertsResult] = await Promise.allSettled([
    getCachedWeatherSnapshot({
      location: input.location,
      provider: input.provider,
    }),
    input.location.key === "all_wdw"
      ? getCachedNwsAlertsForAllWdw()
      : getCachedNwsAlerts({ location: input.location }),
  ]);

  return {
    snapshot: snapshotResult.status === "fulfilled" ? snapshotResult.value : null,
    alerts: alertsResult.status === "fulfilled" ? alertsResult.value : [],
    officialAlertStatus: alertsResult.status === "fulfilled" ? "available" : "unavailable",
  };
}

export async function loadWeatherGuidanceForLocation(
  input: LoadWeatherGuidanceForLocationInput
): Promise<WeatherForTimeSpan> {
  const now = input.now ?? new Date();
  const location = resolveLocation(input);
  const startsAt = input.startsAt ? asWeatherTime(input.startsAt) : toWeatherLocationTime(now);
  const endsAt = input.endsAt
    ? asWeatherTime(input.endsAt)
    : toWeatherLocationTime(addHours(new Date(startsAt), 1));
  const selection = chooseWeatherProviderForTimeSpan({
    now,
    startsAt,
    endsAt,
  });
  const { snapshot, alerts, officialAlertStatus } = await loadSnapshotAndAlerts({
    location,
    provider: selection.provider,
  });
  const precipMap: WeatherPrecipMapContext | undefined = input.includePrecipMap
    ? getWeatherApiPrecipMapContext({ location, now })
    : undefined;

  return buildWeatherGuidanceForTimeSpan({
    locationKey: location.key,
    startsAt,
    endsAt,
    snapshot,
    alerts,
    now,
    officialAlertStatus,
    activityWeatherFits: input.activityWeatherFits,
    includeNearTerm: input.includeNearTerm,
    precipMap,
    timeBasis: input.timeBasis,
    timeBasisLabel: input.timeBasisLabel,
  });
}

export async function loadWeatherByOccurrence({
  occurrences,
  now = new Date(),
  includeNearTerm = true,
  includePrecipMap = false,
}: LoadWeatherByOccurrenceInput): Promise<Record<string, WeatherForTimeSpan>> {
  const grouped = groupOccurrencesByWeatherLocation(occurrences);
  const weatherById: Record<string, WeatherForTimeSpan> = {};
  const {
    getCachedNwsAlerts,
    getCachedNwsAlertsForAllWdw,
    getCachedWeatherSnapshot,
  } = await loadWeatherCache();

  for (const [locationKey, group] of Object.entries(grouped)) {
    if (group.length === 0) continue;
    const location = getWeatherLocation(parseWeatherLocationKey(locationKey));
    const providers = new Set(
      group.map((occurrence) =>
        chooseWeatherProviderForTimeSpan({
          now,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
        }).provider
      )
    );
    const alertsResult = await Promise.allSettled([
      location.key === "all_wdw"
        ? getCachedNwsAlertsForAllWdw()
        : getCachedNwsAlerts({ location }),
    ]);
    const alerts =
      alertsResult[0]?.status === "fulfilled" ? alertsResult[0].value : [];
    const officialAlertStatus: OfficialAlertStatus =
      alertsResult[0]?.status === "fulfilled" ? "available" : "unavailable";
    const snapshots = new Map<WeatherProviderId, WeatherSnapshot | null>();

    await Promise.all(
      Array.from(providers).map(async (provider) => {
        const result = await Promise.allSettled([
          getCachedWeatherSnapshot({ location, provider }),
        ]);
        snapshots.set(
          provider,
          result[0]?.status === "fulfilled" ? result[0].value : null
        );
      })
    );

    for (const occurrence of group) {
      const selection = chooseWeatherProviderForTimeSpan({
        now,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
      });
      const snapshot = snapshots.get(selection.provider) ?? null;
      const precipMap = includePrecipMap
        ? getWeatherApiPrecipMapContext({ location, now })
        : undefined;
      weatherById[occurrence.id] = buildWeatherGuidanceForTimeSpan({
        locationKey: location.key,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        snapshot,
        alerts,
        now,
        officialAlertStatus,
        includeNearTerm,
        precipMap,
        timeBasis: occurrence.timeBasis,
        timeBasisLabel: occurrence.timeBasisLabel,
      });
    }
  }

  return weatherById;
}
