import type { WeatherHour } from "@/lib/weather/types";
import { formatTempDual } from "@/lib/weather/format";

export function ForecastTimeline({ hours }: { hours: WeatherHour[] }) {
  const groups = [
    { label: "Now", rows: hours.slice(0, 1) },
    { label: "Next 2 hours", rows: hours.slice(1, 3) },
    { label: "Afternoon", rows: hours.filter((hour) => new Date(hour.time).getHours() >= 12 && new Date(hour.time).getHours() < 17) },
    { label: "Evening", rows: hours.filter((hour) => new Date(hour.time).getHours() >= 17 && new Date(hour.time).getHours() < 22) },
    { label: "Tonight", rows: hours.filter((hour) => new Date(hour.time).getHours() >= 22 || new Date(hour.time).getHours() < 6) },
  ];
  return (
    <section className="forecast-timeline">
      {groups.map((group) => (
        <article key={group.label}>
          <h3>{group.label}</h3>
          {group.rows.slice(0, 3).map((hour) => (
            <p key={`${group.label}-${hour.time}`}>
              <time dateTime={hour.time}>{new Date(hour.time).toLocaleTimeString()}</time>{" "}
              {hour.conditionText} · {formatTempDual(hour.tempF, hour.tempC)}
            </p>
          ))}
        </article>
      ))}
    </section>
  );
}
