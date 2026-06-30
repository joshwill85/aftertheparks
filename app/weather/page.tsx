import type { CSSProperties } from "react";
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
  WeatherRiskLevel,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const revalidate = 60;

const DISNEY_WEATHER_LOCATION_KEYS: WeatherLocationKey[] = [
  "magic_kingdom_resort_area",
  "epcot_boardwalk_area",
  "skyliner_area",
  "animal_kingdom_lodge_area",
  "disney_springs_area",
  "all_wdw",
];

type WeatherChapterSlot = "thisHour" | "soon" | "dayTurn";

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

const title = "Is it a good time for resort activities?";
const description =
  "Check rain, heat, and storm risk by resort area before you head out.";

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

function formatRange(startIso: string, endIso?: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    timeZone: "America/New_York",
  });
  if (!endIso) return formatter.format(new Date(startIso));
  return `${formatter.format(new Date(startIso))} to ${formatter.format(new Date(endIso))}`;
}

function tempLabel(tempF?: number, tempC?: number): string {
  if (tempF == null && tempC == null) return "Temp pending";
  if (tempF != null && tempC != null) return formatTempDual(tempF, tempC);
  return tempF != null ? `${Math.round(tempF)}°F` : `${Math.round(tempC ?? 0)}°C`;
}

function primaryTempLabel(tempF?: number, tempC?: number): string {
  if (tempF != null) return `${Math.round(tempF)}°`;
  if (tempC != null) return `${Math.round(tempC)}°C`;
  return "--";
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

function strongestRisk(weather: WeatherForTimeSpan): "alert" | "storm" | "rain" | "heat" | "good" {
  if (weather.nwsAlerts.length > 0) return "alert";
  if (weather.risk.stormRisk === "high") return "storm";
  if (weather.risk.rainRisk === "high") return "rain";
  if (weather.risk.heatRisk === "high") return "heat";
  return "good";
}

function riskClass(weather: WeatherForTimeSpan): string {
  return `weather-tone-${strongestRisk(weather)}`;
}

function riskLabel(weather: WeatherForTimeSpan): string {
  const risk = strongestRisk(weather);
  if (risk === "alert") return "Official alert";
  if (risk === "storm") return "Stay covered";
  if (risk === "rain") return "Rain window";
  if (risk === "heat") return "Heat buildup";
  return "Outdoor plans right now";
}

function chapterLabel(slot: WeatherChapterSlot, weather: WeatherForTimeSpan): string {
  const risk = strongestRisk(weather);
  if (risk === "alert") return "Follow official guidance";
  if (risk === "storm") return "Stay under cover";
  if (risk === "rain") return slot === "dayTurn" ? "Showers may linger" : "Watch the sky";
  if (risk === "heat") return slot === "dayTurn" ? "Let the heat fade" : "Pace the sunny stretch";
  if (slot === "thisHour") return "Step out with confidence";
  if (slot === "soon") return "Keep outdoor plans moving";
  return "Evening can open up";
}

function rainStrength(value?: number): string {
  if (value == null) return "unknown";
  if (value >= 60) return "strong";
  if (value >= 30) return "building";
  if (value > 0) return "trace";
  return "quiet";
}

function riskScore(risk: WeatherRiskLevel): number {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function hourOutdoorScore(hour: WeatherHour): number {
  const rain = hour.chanceOfRainPct ?? 0;
  const thunder = hour.chanceOfThunderPct ?? 0;
  const heat = hour.tempF >= 95 ? 2 : hour.tempF >= 90 ? 1 : 0;
  return Math.min(4, Math.round(rain / 25) + Math.round(thunder / 35) + heat);
}

function pointStyle(hour: WeatherHour, minTemp: number, maxTemp: number): CSSProperties {
  const tempRange = Math.max(1, maxTemp - minTemp);
  const tempPosition = 14 + ((hour.tempF - minTemp) / tempRange) * 62;
  const rainHeight = Math.max(4, Math.min(76, hour.chanceOfRainPct ?? 0));
  return {
    "--temp-y": `${Math.round(86 - tempPosition)}%`,
    "--rain-h": `${rainHeight}%`,
  } as CSSProperties;
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

function WeatherDayArc({ area }: { area: WeatherAreaView }) {
  const hours = area.hourly.slice(0, 10);
  const temps = hours.map((hour) => hour.tempF);
  const minTemp = temps.length > 0 ? Math.min(...temps) : area.now.tempF ?? 75;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : area.now.tempF ?? 95;

  return (
    <section className="weather-day-arc" aria-labelledby="weather-day-arc-heading">
      <div className="weather-day-arc__header">
        <div>
          <span className="weather-kicker">{"Today's weather pattern"}</span>
          <h2 id="weather-day-arc-heading">{chapterLabel("thisHour", area.now)}</h2>
        </div>
        <p>{area.now.plainLanguageSummary}</p>
      </div>
      {hours.length > 0 ? (
        <div className="weather-day-arc__graph" role="list" aria-label="Hourly temperature and rain pattern">
          {hours.map((hour) => (
            <div
              className={`weather-day-arc__point weather-rain-${rainStrength(hour.chanceOfRainPct)}`}
              style={pointStyle(hour, minTemp, maxTemp)}
              role="listitem"
              key={`arc-${hour.time}`}
            >
              <span className="weather-day-arc__rain" />
              <span className="weather-day-arc__temp-dot" />
              <time dateTime={hour.time}>{formatHour(hour.time)}</time>
              <strong>{primaryTempLabel(hour.tempF, hour.tempC)}</strong>
              <small>{rainLabel(hour.chanceOfRainPct)}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="weather-empty-line">Hourly forecast unavailable.</p>
      )}
      <div className="weather-day-arc__legend">
        <span>Temperature path</span>
        <span>Rain intensity</span>
        <span>{riskLabel(area.now)}</span>
      </div>
    </section>
  );
}

function HeroWeatherPanel({ area }: { area: WeatherAreaView }) {
  return (
    <section className={`weather-atmosphere ${riskClass(area.now)}`}>
      <div className="weather-atmosphere__copy">
        <span className="weather-kicker">Walt Disney World</span>
        <h1>Is it a good time for resort activities?</h1>
        <p>
          Check rain, heat, and storm risk by resort area before you head out.
        </p>
        <div className="weather-atmosphere__actions">
          <Link href="/today?weather=indoor">Indoor backups</Link>
          <Link href="/tonight?weather=covered">Covered tonight</Link>
        </div>
      </div>
      <article className="weather-current-orb" aria-label="Current Walt Disney World weather">
        <div className="weather-current-orb__sky">
          <WeatherIcon iconKey={area.now.iconKey} className="weather-current-orb__icon" decorative />
        </div>
        <div className="weather-current-orb__reading">
          <span>{riskLabel(area.now)}</span>
          <strong>{primaryTempLabel(area.now.tempF, area.now.tempC)}</strong>
          <p>{area.now.headline}</p>
        </div>
        <NearTermRainLine signal={area.now.nearTermRain} />
        <WeatherFreshnessLine weather={area.now} />
        <WeatherPrecipMapPreview precipMap={area.now.precipMap} />
      </article>
    </section>
  );
}

function MicroclimateRail({ areas }: { areas: WeatherAreaView[] }) {
  return (
    <section className="weather-page-section weather-microclimate-rail" aria-labelledby="weather-area-heading">
      <div className="weather-page-section__heading">
        <span className="weather-kicker">Weather by resort area</span>
        <h2 id="weather-area-heading">Weather can differ across Disney World.</h2>
        <p>Tap an area to jump into the local read before you cross property.</p>
      </div>
      <div className="weather-microclimate-rail__track" role="list">
        {areas.map((area) => (
          <article
            className={`weather-area-card ${riskClass(area.now)}`}
            id={weatherAreaAnchorId(area.location.key)}
            role="listitem"
            key={area.location.key}
          >
            <Link
              href={weatherPageHref(area.location.key)}
              className="weather-area-card__icon-link"
              aria-label={`Open detailed weather for ${area.location.name}`}
            >
              <WeatherIcon iconKey={area.now.iconKey} className="weather-area-card__icon" decorative />
            </Link>
            <div>
              <h2>{area.location.name}</h2>
              <p className="weather-area-card__headline">{chapterLabel("thisHour", area.now)}</p>
            </div>
            <div className="weather-area-card__metrics" aria-label={`${area.location.name} weather details`}>
              <span>{primaryTempLabel(area.now.tempF, area.now.tempC)}</span>
              <span>{rainLabel(area.now.rainChancePct)}</span>
              <span>{area.now.nwsAlerts.length > 0 ? `${area.now.nwsAlerts.length} alert` : riskLabel(area.now)}</span>
            </div>
            <WeatherFreshnessLine weather={area.now} />
          </article>
        ))}
      </div>
    </section>
  );
}

function WeatherChapterCard({
  area,
  slot,
  weather,
}: {
  area: WeatherAreaView;
  slot: WeatherChapterSlot;
  weather: WeatherForTimeSpan;
}) {
  return (
    <article className={`weather-chapter-card ${riskClass(weather)}`}>
      <div className="weather-chapter-card__topline">
        <span>{formatRange(weather.startsAt, weather.endsAt)}</span>
        <WeatherIcon iconKey={weather.iconKey} className="weather-chapter-card__icon" decorative />
      </div>
      <h3>{chapterLabel(slot, weather)}</h3>
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
        <div>
          <dt>Fit</dt>
          <dd>{riskLabel(weather)}</dd>
        </div>
      </dl>
      <Link href={weatherPageHref(area.location.key)}>Read {area.location.name}</Link>
    </article>
  );
}

function WeatherChapterArea({ area }: { area: WeatherAreaView }) {
  return (
    <section className="weather-chapter-area">
      <div className="weather-chapter-area__heading">
        <h3>{area.location.name}</h3>
        <p>{area.now.headline}</p>
      </div>
      <div className="weather-chapter-area__cards">
        <WeatherChapterCard area={area} slot="thisHour" weather={area.now} />
        <WeatherChapterCard area={area} slot="soon" weather={area.next} />
        <WeatherChapterCard area={area} slot="dayTurn" weather={area.later} />
      </div>
    </section>
  );
}

function HourlyArea({ area }: { area: WeatherAreaView }) {
  return (
    <article className="weather-hourly-area">
      <h3>{area.location.name}</h3>
      <div className="weather-hour-row" role="list" aria-label={`${area.location.name} hourly forecast`}>
        {area.hourly.length > 0 ? (
          area.hourly.slice(0, 8).map((hour) => (
            <div
              className={`weather-hour-chip weather-hour-chip--score-${hourOutdoorScore(hour)}`}
              role="listitem"
              key={`${area.location.key}-${hour.time}`}
            >
              <time dateTime={hour.time}>{formatHour(hour.time)}</time>
              <WeatherIcon iconKey={hour.iconKey} className="weather-hour-chip__icon" />
              <strong>{primaryTempLabel(hour.tempF, hour.tempC)}</strong>
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

function WeatherRiskConstellation({ area }: { area: WeatherAreaView }) {
  const risks = [
    ["Rain", area.now.risk.rainRisk],
    ["Storm", area.now.risk.stormRisk],
    ["Heat", area.now.risk.heatRisk],
    ["Wind", area.now.risk.windRisk],
  ] as const;

  return (
    <aside className="weather-risk-constellation" aria-label="Current weather risk levels">
      {risks.map(([label, risk]) => (
        <div className={`weather-risk-constellation__item weather-risk-constellation__item--${risk}`} key={label}>
          <span>{label}</span>
          <strong>{riskScore(risk)}</strong>
        </div>
      ))}
    </aside>
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
      <HeroWeatherPanel area={allWdw} />

      <section className="weather-story-stage">
        <WeatherDayArc area={allWdw} />
        <WeatherRiskConstellation area={allWdw} />
      </section>

      <MicroclimateRail areas={areas} />

      <section className="weather-page-section" aria-labelledby="weather-flow-heading">
        <div className="weather-page-section__heading">
          <span className="weather-kicker">Area-by-area forecast</span>
          <h2 id="weather-flow-heading">A better rhythm for moving around property.</h2>
          <p>Each resort area gets a short sequence: what to trust, what to watch, and when to pivot.</p>
        </div>
        <div className="weather-chapter-grid">
          {disneyAreas.map((area) => (
            <WeatherChapterArea area={area} key={`flow-${area.location.key}`} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-hourly-heading">
        <div className="weather-page-section__heading">
          <span className="weather-kicker">Hour by hour</span>
          <h2 id="weather-hourly-heading">Hour-by-hour forecast.</h2>
          <p>Short-horizon temperature and rain context by Disney resort area.</p>
        </div>
        <div className="weather-hourly-grid">
          {areas.map((area) => (
            <HourlyArea area={area} key={`hourly-${area.location.key}`} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-daily-heading">
        <div className="weather-page-section__heading">
          <span className="weather-kicker">Three-day view</span>
          <h2 id="weather-daily-heading">Plan the near horizon.</h2>
          <p>Quick daily context for matching activities to better windows.</p>
        </div>
        <div className="weather-daily-grid">
          {areas.map((area) => (
            <DailyArea area={area} key={`daily-${area.location.key}`} />
          ))}
        </div>
      </section>

      <section className="weather-page-section" aria-labelledby="weather-weekly-heading">
        <div className="weather-page-section__heading">
          <span className="weather-kicker">Week shape</span>
          <h2 id="weather-weekly-heading">The longer planning layer.</h2>
          <p>NWS-backed weekly context where available.</p>
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
