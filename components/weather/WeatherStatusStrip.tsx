import type { WeatherForTimeSpan } from "@/lib/weather/types";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { cn } from "@/lib/utils";

export type WeatherStatusState =
  | "normal"
  | "rain"
  | "heat"
  | "storm"
  | "official_alert"
  | "stale"
  | "unavailable";

function weatherActionLabel(action?: WeatherForTimeSpan["actionGuidance"]): string {
  switch (action) {
    case "good_now":
      return "Outdoor plans OK";
    case "go_earlier":
      return "Go earlier";
    case "choose_covered_backup":
      return "Pick covered backup";
    case "stay_inside":
      return "Stay inside";
    case "official_alert":
      return "Official alert";
    default:
      return "Weather guidance";
  }
}

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
  const actionGuidance = weather?.actionGuidance;
  const defaultActions =
    actionGuidance === "choose_covered_backup"
      ? [{ label: "Covered Options", href: "/activities?preset=rain_backup" }]
      : [];
  const visibleActions = actions ?? defaultActions;

  return (
    <section className={cn("weather-status-strip", `weather-status-strip--${state}`)}>
      <div className="weather-status-strip__body">
        <p className="weather-status-strip__eyebrow">Weather</p>
        <h2>{headline ?? weatherActionLabel(actionGuidance)}</h2>
        <p>{summary ?? weather?.plainLanguageSummary ?? "Use current and upcoming conditions to shape the plan."}</p>
        {weather && <NearTermRainLine signal={weather.nearTermRain} compact />}
        {weather && <WeatherFreshnessLine weather={weather} />}
      </div>
      {visibleActions.length > 0 && (
        <div className="weather-status-strip__actions">
          {visibleActions.map((action) => (
            <a className="weather-status-strip__action" key={action.href} href={action.href}>
              {action.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
