import type { ForecastCompareResult } from "@/lib/weather/forecastCompare";

export function ForecastCompare({ result }: { result: ForecastCompareResult }) {
  return (
    <section className="forecast-compare">
      <h3>
        {result.allowed
          ? result.recommendation === "go_earlier"
            ? "Go earlier"
            : "Keep this timing"
          : "Soft planning only"}
      </h3>
      <p>{result.reason}</p>
    </section>
  );
}
