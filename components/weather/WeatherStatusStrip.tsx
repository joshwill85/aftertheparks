import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";
import { cn } from "@/lib/utils";

export type WeatherStatusState =
  | "normal"
  | "rain"
  | "heat"
  | "storm"
  | "official_alert"
  | "stale"
  | "unavailable";

export function WeatherStatusStrip({
  state,
  headline,
  summary,
  weather,
  actions,
}: {
  state: WeatherStatusState;
  headline?: string;
  summary?: string;
  weather?: WeatherForTimeSpan | null;
  actions?: Array<{ label: string; href: string }>;
}) {
  return (
    <section className={cn("weather-status-strip", `weather-status-strip--${state}`)}>
      <div>
        <p className="weather-status-strip__eyebrow">Weather</p>
        <h2>{headline ?? weather?.headline ?? "Weather guidance"}</h2>
        <p>{summary ?? weather?.plainLanguageSummary ?? "Use current and upcoming conditions to shape the plan."}</p>
        {weather && <NearTermRainLine signal={weather.nearTermRain} compact />}
        {weather && <WeatherFreshnessLine weather={weather} />}
      </div>
      {weather?.precipMap && <WeatherPrecipMapPreview precipMap={weather.precipMap} />}
      {actions && actions.length > 0 && (
        <div className="weather-status-strip__actions">
          {actions.map((action) => (
            <a key={action.href} href={action.href}>
              {action.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
