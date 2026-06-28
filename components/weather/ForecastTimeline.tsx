import type { WeatherHour } from "@/lib/weather/types";
import { formatTempDual } from "@/lib/weather/format";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { buildForecastTimelineGroups } from "@/lib/weather/forecastTimeline";

export function ForecastTimeline({
  hours,
  now,
}: {
  hours: WeatherHour[];
  now?: Date;
}) {
  const groups = buildForecastTimelineGroups({ hours, now });
  if (groups.length === 0) return null;

  return (
    <section className="forecast-timeline">
      {groups.map((group) => (
        <article className="forecast-timeline__group" key={group.label}>
          <h3>{group.label}</h3>
          {group.rows.map(({ hour, displayTime, isNow }) => (
            <div className="forecast-timeline__row" key={`${group.label}-${hour.time}`}>
              <WeatherIcon
                iconKey={hour.iconKey}
                className="forecast-timeline__icon"
                decorative
              />
              <div>
                <time dateTime={isNow ? now?.toISOString() ?? hour.time : hour.time}>
                  {displayTime}
                </time>
                <p>
                  {hour.conditionText} · {formatTempDual(hour.tempF, hour.tempC)}
                </p>
              </div>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
