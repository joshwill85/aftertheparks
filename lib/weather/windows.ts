import type { ActivityWeatherFit, WeatherLocationKey, WeatherRiskLevel, WeatherWindow } from "@/lib/weather/types";

export interface WeatherWindowRiskInput {
  startsAt: string;
  endsAt: string;
  rainRisk: WeatherRiskLevel;
  stormRisk: WeatherRiskLevel;
  heatRisk: WeatherRiskLevel;
}

function windowAction(risk: WeatherWindowRiskInput): WeatherWindow["action"] {
  if (risk.stormRisk === "high") return "stay_indoors";
  if (risk.rainRisk === "high") return "bring_backup";
  if (risk.heatRisk === "high") return "bring_backup";
  return "go_now";
}

function chapterLabel(risk: WeatherWindowRiskInput): WeatherWindow["chapterLabel"] {
  if (risk.stormRisk === "high") return "Storm Mode";
  if (risk.rainRisk === "high") return "Rain Window";
  if (risk.heatRisk === "high") return "Heat Buildup";
  const hour = new Date(risk.startsAt).getHours();
  return hour >= 18 ? "Starlight Reset" : "Sunshine Start";
}

export function buildWeatherWindows(input: {
  locationKey: WeatherLocationKey;
  startsAt: string;
  endsAt: string;
  risksByWindow: WeatherWindowRiskInput[];
}): WeatherWindow[] {
  return input.risksByWindow.map((risk, index) => {
    const action = windowAction(risk);
    const chapter = chapterLabel(risk);
    const recommendedActivityTags: ActivityWeatherFit[] =
      action === "go_now" ? ["outdoor_shaded", "outdoor_uncovered"] : ["indoor", "covered"];
    return {
      id: `${input.locationKey}-${index}-${risk.startsAt}`,
      locationKey: input.locationKey,
      startsAt: risk.startsAt,
      endsAt: risk.endsAt,
      title: chapter,
      chapterLabel: chapter,
      action,
      headline:
        action === "go_now"
          ? "Good outdoor window"
          : action === "stay_indoors"
            ? "Stay indoors while storm risk is high"
            : "Bring a backup for this weather window",
      plainLanguageSummary:
        action === "go_now"
          ? "Outdoor resort exploring fits this window."
          : "Plan this window around indoor or covered options.",
      recommendedActivityTags,
      cautionActivityTags: risk.heatRisk === "high" ? ["walking_heavy", "heat_sensitive"] : [],
      avoidActivityTags: risk.stormRisk === "high" ? ["pool", "campfire", "outdoor_movie", "skyliner_dependent"] : [],
      deepLinks: [
        {
          label: action === "go_now" ? "See outdoor activities" : "Find indoor backups",
          href: action === "go_now" ? "/today?weather=outdoor" : "/today?weather=indoor",
        },
      ],
    };
  });
}
