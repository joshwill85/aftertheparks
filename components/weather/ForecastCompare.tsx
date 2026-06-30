import type { ForecastCompareResult } from "@/lib/weather/forecastCompare";
import { WEATHER_DECISION_LABELS } from "@/lib/weather/guidance";

export function ForecastCompare({ result }: { result: ForecastCompareResult }) {
  return (
    <section className="forecast-compare">
      <h3>
        {result.allowed
          ? result.recommendation === "go_earlier"
            ? WEATHER_DECISION_LABELS.rainNearby
            : WEATHER_DECISION_LABELS.goodForOutdoorPlans
          : "Check closer to the date"}
      </h3>
      <p>{result.reason}</p>
    </section>
  );
}
