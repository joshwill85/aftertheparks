import type { PlanResilienceScore as PlanResilienceScoreValue, WeatherForTimeSpan } from "@/lib/weather/types";
import { PlanResilienceScore } from "@/components/weather/PlanResilienceScore";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";
import Link from "next/link";

export function PlanWeatherPanel({
  weather,
  resilience,
  affectedItemCount = 0,
  backupHref = "/activities?weather=indoor",
  replaceHref = "/activities?weather=covered",
  onApplyWeatherNote,
}: {
  weather?: WeatherForTimeSpan | null;
  resilience?: PlanResilienceScoreValue;
  affectedItemCount?: number;
  backupHref?: string;
  replaceHref?: string;
  onApplyWeatherNote?: (note: string) => void;
}) {
  return (
    <section className="plan-weather-panel">
      <h2>Plan weather</h2>
      <p>{weather?.headline ?? "Weather guidance will appear for dated plan items."}</p>
      {weather && <NearTermRainLine signal={weather.nearTermRain} />}
      {weather?.precipMap && <WeatherPrecipMapPreview precipMap={weather.precipMap} />}
      <p>{affectedItemCount} saved items may need weather-aware attention.</p>
      <div className="plan-weather-panel__actions">
        <Link href={backupHref}>Add backup</Link>
        <Link href={replaceHref}>Replace activity</Link>
        <button
          type="button"
          onClick={() => onApplyWeatherNote?.("Weather note: Try moving this earlier if rain builds later.")}
        >
          Move earlier
        </button>
        <button
          type="button"
          onClick={() => onApplyWeatherNote?.("Weather note: Move this later if rain clears before evening.")}
        >
          Move later
        </button>
        <button
          type="button"
          onClick={() => onApplyWeatherNote?.("Weather note: Keep this as weather-dependent and confirm before leaving.")}
        >
          Keep as weather-dependent
        </button>
        <Link href="/activities?weather=indoor">Show same-resort indoor options</Link>
      </div>
      {resilience && <PlanResilienceScore score={resilience} />}
    </section>
  );
}
