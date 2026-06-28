import { DEFAULT_WEATHER_RISK, type WeatherAlert, type WeatherForTimeSpan, type WeatherHour, type WeatherLocationKey } from "@/lib/weather/types";
import { defaultWeatherEndTime } from "@/lib/weather/time";

export function shouldShowWeatherForOccurrence(
  now: Date,
  startsAt: Date,
  endsAt?: Date
): boolean {
  const effectiveEnd = endsAt ?? startsAt;
  return effectiveEnd >= now;
}

function overlaps(hour: WeatherHour, spanStart: Date, spanEnd: Date): boolean {
  const time = new Date(hour.time).getTime();
  return time >= spanStart.getTime() && time <= spanEnd.getTime();
}

function rankHour(hour: WeatherHour): number {
  let score = hour.chanceOfRainPct ?? 0;
  score += (hour.chanceOfThunderPct ?? 0) * 2;
  if (hour.iconKey === "official_alert") score += 300;
  if (hour.iconKey === "rain_with_thunder") score += 140;
  if (hour.iconKey === "thunder_possible") score += 90;
  if (hour.iconKey.includes("rain")) score += 40;
  if (hour.iconKey === "heat") score += 30;
  if (hour.iconKey === "wind") score += 20;
  return score;
}

export function getWeatherForOccurrence(input: {
  now?: Date;
  startsAt: string;
  endsAt?: string;
  locationKey: WeatherLocationKey;
  hourlyForecast: WeatherHour[];
  alerts?: WeatherAlert[];
  fetchedAt: string;
  expiresAt?: string;
  staleAfter?: string;
  isStale?: boolean;
}): WeatherForTimeSpan | null {
  const now = input.now ?? new Date();
  const startsAt = new Date(input.startsAt);
  const plannedEnd = input.endsAt
    ? new Date(input.endsAt)
    : defaultWeatherEndTime(startsAt);

  if (!shouldShowWeatherForOccurrence(now, startsAt, plannedEnd)) return null;

  const spanStart = startsAt < now ? now : startsAt;
  const hourlyBreakdown = input.hourlyForecast.filter((hour) =>
    overlaps(hour, spanStart, plannedEnd)
  );
  const worstHour =
    hourlyBreakdown.slice().sort((a, b) => rankHour(b) - rankHour(a))[0] ??
    input.hourlyForecast.slice().sort((a, b) => {
      const aDistance = Math.abs(new Date(a.time).getTime() - spanStart.getTime());
      const bDistance = Math.abs(new Date(b.time).getTime() - spanStart.getTime());
      return aDistance - bDistance;
    })[0];
  const alerts = input.alerts ?? [];
  const rainChancePct = Math.max(
    ...hourlyBreakdown.map((hour) => hour.chanceOfRainPct ?? 0),
    worstHour?.chanceOfRainPct ?? 0
  );
  const thunderChancePct = Math.max(
    ...hourlyBreakdown.map((hour) => hour.chanceOfThunderPct ?? 0),
    worstHour?.chanceOfThunderPct ?? 0
  );

  return {
    locationKey: input.locationKey,
    startsAt: startsAt.toISOString(),
    endsAt: plannedEnd.toISOString(),
    isPast: false,
    shouldDisplayWeather: true,
    representativeHour: worstHour?.time
      ? new Date(worstHour.time).toISOString()
      : spanStart.toISOString(),
    iconKey: alerts.length > 0 ? "official_alert" : worstHour?.iconKey ?? "unknown",
    headline:
      alerts.length > 0
        ? "Official weather alert in effect"
        : worstHour?.conditionText ?? "Weather for this time window",
    plainLanguageSummary:
      alerts.length > 0
        ? "Follow official weather guidance and keep indoor backups ready."
        : "Use the worst meaningful hour in this event window, not the nicest average.",
    tempF: worstHour?.tempF,
    tempC: worstHour?.tempC,
    feelsLikeF: worstHour?.feelsLikeF,
    feelsLikeC: worstHour?.feelsLikeC,
    rainChancePct,
    thunderChancePct,
    windMph: worstHour?.windMph,
    windKph: worstHour?.windKph,
    hourlyBreakdown,
    risk: DEFAULT_WEATHER_RISK,
    nwsAlerts: alerts,
    fetchedAt: input.fetchedAt,
    expiresAt: input.expiresAt ?? input.fetchedAt,
    staleAfter: input.staleAfter ?? input.fetchedAt,
    isStale: input.isStale ?? false,
    forecastStatus: input.isStale ? "stale" : "available",
    officialAlertStatus: "available",
  };
}
