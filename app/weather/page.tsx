import type { Metadata } from "next";
import Link from "next/link";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";
import {
  getCachedNwsAlerts,
  getCachedNwsAlertsForAllWdw,
  getCachedWeatherSnapshot,
} from "@/lib/weather/cache";
import { buildWeatherGuidanceForTimeSpan } from "@/lib/weather/guidance";
import { getWeatherLocation } from "@/lib/weather/locations";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";
import { chooseWeatherProviderForTimeSpan } from "@/lib/weather/providerRouter";
import { formatTempDual } from "@/lib/weather/format";
import { weatherAreaAnchorId, weatherPageHref } from "@/lib/weather/links";
import type {
  WeatherDay,
  WeatherForTimeSpan,
  WeatherHour,
  WeatherLocation,
  WeatherLocationKey,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

const DISNEY_WEATHER_LOCATION_KEYS: WeatherLocationKey[] = [
  "magic_kingdom_resort_area",
  "epcot_boardwalk_area",
  "skyliner_area",
  "animal_kingdom_lodge_area",
  "disney_springs_area",
  "all_wdw",
];

type WeatherAreaView = {
  location: WeatherLocation;
  snapshot: WeatherSnapshot | null;
  weeklySnapshot: WeatherSnapshot | null;
  now: WeatherForTimeSpan;
  next: WeatherForTimeSpan;
  later: WeatherForTimeSpan;
  hourly: WeatherHour[];
  daily: WeatherDay[];
};

const title = "Disney World Weather";
const description =
  "Now, next, hourly, daily, and weekly weather guidance for Walt Disney World resort areas, with official alerts and near-term rain context.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/weather" },
  ...buildSocialMetadata({
    title,
    description,
    path: "/weather",
    imageEyebrow: "Disney resort weather",
    imageSummary:
      "Current WeatherAPI and NWS-backed weather guidance for Walt Disney World resort areas, including near-term rain and weekly planning context.",
  }),
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function mergeDailyForecasts(primary?: WeatherDay[], secondary?: WeatherDay[]): WeatherDay[] {
  const byDate = new Map<string, WeatherDay>();
  for (const day of [...(primary ?? []), ...(secondary ?? [])]) {
    if (!byDate.has(day.date)) byDate.set(day.date, day);
  }
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);
}

function upcomingHours(snapshot: WeatherSnapshot | null, now: Date): WeatherHour[] {
  return (snapshot?.hourly ?? [])
    .filter((hour) => new Date(hour.time).getTime() >= now.getTime() - 30 * 60 * 1000)
    .slice(0, 12);
}

function formatHour(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function tempLabel(tempF?: number, tempC?: number): string {
  if (tempF == null && tempC == null) return "Temp pending";
  if (tempF != null && tempC != null) return formatTempDual(tempF, tempC);
  return tempF != null ? `${Math.round(tempF)}°F` : `${Math.round(tempC ?? 0)}°C`;
}

function rainLabel(value?: number): string {
  return value == null ? "Rain pending" : `${Math.round(value)}% rain`;
}

function dayTempLabel(day: WeatherDay): string {
  if (day.maxTempF != null && day.minTempF != null) {
    return `${Math.round(day.maxTempF)}° / ${Math.round(day.minTempF)}°F`;
  }
  return tempLabel(day.avgTempF ?? day.maxTempF, day.avgTempC ?? day.maxTempC);
}

function forecastClass(weather: WeatherForTimeSpan): string {
  if (weather.nwsAlerts.length > 0) return "weather-page-signal--alert";
  if (weather.risk.stormRisk === "high") return "weather-page-signal--storm";
  if (weather.risk.rainRisk === "high") return "weather-page-signal--rain";
  if (weather.risk.heatRisk === "high") return "weather-page-signal--heat";
  return "weather-page-signal--good";
}

async function loadAreaWeather(key: WeatherLocationKey, now: Date): Promise<WeatherAreaView> {
  const location = getWeatherLocation(key);
  const nowIso = now.toISOString();
  const nextStart = addHours(now, 2);
  const nextEnd = addHours(now, 4);
  const laterStart = addHours(now, 7);
  const laterEnd = addHours(now, 12);
  const selected = chooseWeatherProviderForTimeSpan({
    now,
    startsAt: nowIso,
    endsAt: addHours(now, 1).toISOString(),
  });

  const [snapshotResult, weeklyResult, alertResult] = await Promise.allSettled([
    getCachedWeatherSnapshot({ location, provider: selected.provider }),
    getCachedWeatherSnapshot({ location, provider: "nws_forecast" }),
    key === "all_wdw"
      ? getCachedNwsAlertsForAllWdw()
      : getCachedNwsAlerts({ location }),
  ]);

  const snapshot = snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
  const weeklySnapshot = weeklyResult.status === "fulfilled" ? weeklyResult.value : null;
  const alerts = alertResult.status === "fulfilled" ? alertResult.value : [];
  const precipMap = getWeatherApiPrecipMapContext({ location, now });

  const nowGuidance = buildWeatherGuidanceForTimeSpan({
    locationKey: key,
    startsAt: nowIso,
    endsAt: addHours(now, 1).toISOString(),
    snapshot,
    alerts,
    now,
    includeNearTerm: true,
    precipMap,
  });

  return {
    location,
    snapshot,
    weeklySnapshot,
    now: nowGuidance,
    next: buildWeatherGuidanceForTimeSpan({
      locationKey: key,
      startsAt: nextStart.toISOString(),
      endsAt: nextEnd.toISOString(),
      snapshot,
      alerts,
      now,
      includeNearTerm: true,
    }),
    later: buildWeatherGuidanceForTimeSpan({
      locationKey: key,
      startsAt: laterStart.toISOString(),
      endsAt: laterEnd.toISOString(),
      snapshot: snapshot ?? weeklySnapshot,
      alerts,
      now,
      includeNearTerm: false,
    }),
    hourly: upcomingHours(snapshot, now),
    daily: mergeDailyForecasts(snapshot?.daily, weeklySnapshot?.daily),
  };
}

function WeatherSignalCard({
  label,
  weather,
}: {
  label: "Now" | "Next" | "Later";
  weather: WeatherForTimeSpan;
}) {
  return (
    <article className={`weather-page-signal ${forecastClass(weather)}`}>
      <div className="weather-page-signal__topline">
        <span>{label}</span>
        <WeatherIcon iconKey={weather.iconKey} className="weather-page-signal__icon" />
      </div>
      <h3>{weather.headline}</h3>
      <p>{weather.plainLanguageSummary}</p>
      <dl>
        <div>
          <dt>Temp</dt>
          <dd>{tempLabel(weather.tempF, weather.tempC)}</dd>
        </div>
        <div>
          <dt>Rain</dt>
          <dd>{rainLabel(weather.rainChancePct)}</dd>
        </div>
      </dl>
      {label === "Now" && <NearTermRainLine signal={weather.nearTermRain} compact />}
    </article>
  );
}

function AreaOverviewCard({ area }: { area: WeatherAreaView }) {
  return (
    <article className="weather-area-card" id={weatherAreaAnchorId(area.location.key)}>
      <div className="weather-area-card__header">
        <div>
          <h2>{area.location.name}</h2>
          <WeatherFreshnessLine weather={area.now} />
        </div>
        <Link
          href={weatherPageHref(area.location.key)}
          className="weather-area-card__icon-link"
          aria-label={`Open detailed weather for ${area.location.name}`}
        >
          <WeatherIcon iconKey={area.now.iconKey} className="weather-area-card__icon" decorative />
        </Link>
      </div>
      <p className="weather-area-card__headline">{area.now.headline}</p>
      <NearTermRainLine signal={area.now.nearTermRain} compact />
      <div className="weather-area-card__metrics" aria-label={`${area.location.name} weather details`}>
        <span>{tempLabel(area.now.tempF, area.now.tempC)}</span>
        <span>{rainLabel(area.now.rainChancePct)}</span>
        <span>{area.now.nwsAlerts.length > 0 ? `${area.now.nwsAlerts.length} alert` : "No active alert"}</span>
      </div>
    </article>
  );
}

function HourlyArea({ area }: { area: WeatherAreaView }) {
  return (
    <article className="weather-hourly-area">
      <h3>{area.location.name}</h3>
      <div className="weather-hour-row" role="list" aria-label={`${area.location.name} hourly forecast`}>
        {area.hourly.length > 0 ? (
          area.hourly.slice(0, 8).map((hour) => (
            <div className="weather-hour-chip" role="listitem" key={`${area.location.key}-${hour.time}`}>
              <time dateTime={hour.time}>{formatHour(hour.time)}</time>
              <WeatherIcon iconKey={hour.iconKey} className="weather-hour-chip__icon" />
              <strong>{tempLabel(hour.tempF, hour.tempC).split(" / ")[0]}</strong>
              <span>{rainLabel(hour.chanceOfRainPct)}</span>
            </div>
          ))
        ) : (
          <p className="weather-empty-line">Hourly forecast unavailable.</p>
        )}
      </div>
    </article>
  );
}

function DailyArea({ area }: { area: WeatherAreaView }) {
  return (
    <article className="weather-daily-area">
      <h3>{area.location.name}</h3>
      <div className="weather-daily-row" role="list" aria-label={`${area.location.name} daily forecast`}>
        {area.daily.length > 0 ? (
          area.daily.slice(0, 3).map((day) => (
            <div className="weather-day-chip" role="listitem" key={`${area.location.key}-${day.date}`}>
              <time dateTime={day.date}>{formatDay(day.date)}</time>
              <WeatherIcon iconKey={day.iconKey} className="weather-day-chip__icon" />
              <strong>{dayTempLabel(day)}</strong>
              <span>{rainLabel(day.chanceOfRainPct)}</span>
            </div>
          ))
        ) : (
          <p className="weather-empty-line">Daily forecast unavailable.</p>
        )}
      </div>
    </article>
  );
}

function WeeklyArea({ area }: { area: WeatherAreaView }) {
  return (
    <article className="weather-weekly-area">
      <h3>{area.location.name}</h3>
      <div className="weather-week-grid" role="list" aria-label={`${area.location.name} weekly forecast by day`}>
        {area.daily.length > 0 ? (
          area.daily.map((day) => (
            <div className="weather-week-cell" role="listitem" key={`${area.location.key}-week-${day.date}`}>
              <time dateTime={day.date}>{formatDay(day.date)}</time>
              <span>{day.conditionText}</span>
              <strong>{dayTempLabel(day)}</strong>
              <small>{rainLabel(day.chanceOfRainPct)}</small>
            </div>
          ))
        ) : (
          <p className="weather-empty-line">Weekly forecast unavailable.</p>
        )}
      </div>
    </article>
  );
}

export default async function WeatherPage() {
  const now = new Date();
  const areas = await Promise.all(
    DISNEY_WEATHER_LOCATION_KEYS.map((key) => loadAreaWeather(key, now))
  );
  const allWdw = areas.find((area) => area.location.key === "all_wdw") ?? areas[0];
  const disneyAreas = areas.filter((area) => area.location.key !== "all_wdw");

  return (
    <main className="weather-page">
      <section className="weather-page-hero">
        <div className="weather-page-hero__copy">
          <h1>Disney World Weather</h1>
          <p>
            Now, next, and later across Walt Disney World resort areas, with
            hourly forecast guidance, official alerts, and weekly planning by day.
          </p>
          <div className="weather-page-hero__actions">
            <Link href="/today?weather=indoor" className="btn-primary rounded-full px-5 py-3 text-sm font-bold">
              Indoor backups
            </Link>
            <Link href="/tonight?weather=covered" className="btn-secondary rounded-full px-5 py-3 text-sm font-bold">
              Covered tonight
            </Link>
          </div>
        </div>
        <article className="weather-page-current" aria-label="Current Walt Disney World weather">
          <div className="weather-page-current__main">
            <Link
              href={weatherPageHref(allWdw.location.key)}
              className="weather-page-current__icon-link"
              aria-label={`Open detailed weather for ${allWdw.location.name}`}
            >
              <WeatherIcon iconKey={allWdw.now.iconKey} className="weather-page-current__icon" decorative />
            </Link>
            <div>
              <span>Forecasted now</span>
              <h2>{allWdw.now.headline}</h2>
              <p>{tempLabel(allWdw.now.tempF, allWdw.now.tempC)} · {rainLabel(allWdw.now.rainChancePct)}</p>
            </div>
          </div>
          <NearTermRainLine signal={allWdw.now.nearTermRain} />
          <WeatherFreshnessLine weather={allWdw.now} />
          <WeatherPrecipMapPreview precipMap={allWdw.now.precipMap} />
        </article>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-area-heading">
        <div className="weather-page-section__heading">
          <h2 id="weather-area-heading">Disney Area Weather</h2>
          <p>Five resort-area forecasts plus the all-property Walt Disney World view.</p>
        </div>
        <div className="weather-area-grid">
          {areas.map((area) => (
            <AreaOverviewCard area={area} key={area.location.key} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-flow-heading">
        <div className="weather-page-section__heading">
          <h2 id="weather-flow-heading">Now, Next, Later</h2>
          <p>A quick story of how the day should flow before you cross property.</p>
        </div>
        <div className="weather-flow-grid">
          {disneyAreas.map((area) => (
            <section className="weather-flow-area" key={`flow-${area.location.key}`}>
              <h3>{area.location.name}</h3>
              <div className="weather-flow-area__signals">
                <WeatherSignalCard label="Now" weather={area.now} />
                <WeatherSignalCard label="Next" weather={area.next} />
                <WeatherSignalCard label="Later" weather={area.later} />
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-hourly-heading">
        <div className="weather-page-section__heading">
          <h2 id="weather-hourly-heading">Hourly Forecast</h2>
          <p>Short-horizon hourly forecast by Disney resort area.</p>
        </div>
        <div className="weather-hourly-grid">
          {areas.map((area) => (
            <HourlyArea area={area} key={`hourly-${area.location.key}`} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-daily-heading">
        <div className="weather-page-section__heading">
          <h2 id="weather-daily-heading">Daily Forecast</h2>
          <p>Today through the next few days for each Disney weather area.</p>
        </div>
        <div className="weather-daily-grid">
          {areas.map((area) => (
            <DailyArea area={area} key={`daily-${area.location.key}`} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-weekly-heading">
        <div className="weather-page-section__heading">
          <h2 id="weather-weekly-heading">Weekly By Day</h2>
          <p>NWS-backed weekly planning context where available.</p>
        </div>
        <div className="weather-weekly-grid">
          {areas.map((area) => (
            <WeeklyArea area={area} key={`weekly-${area.location.key}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
