import type { RouteWeatherLegImpact } from "@/lib/weather/types";

export function RouteWeatherImpact({ impact }: { impact: RouteWeatherLegImpact }) {
  if (process.env.NEXT_PUBLIC_ROUTE_WEATHER_ENABLED !== "true") return null;
  return (
    <section className="route-weather-impact">
      <h3>Route weather impact</h3>
      <p>{impact.caution}</p>
    </section>
  );
}
