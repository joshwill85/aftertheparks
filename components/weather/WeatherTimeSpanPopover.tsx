"use client";

import type { WeatherForTimeSpan } from "@/lib/weather/types";
import {
  formatPrecipDual,
  formatTempDual,
  formatWindDual,
} from "@/lib/weather/format";
import { WeatherFreshnessLine } from "@/components/weather/WeatherFreshnessLine";
import { NearTermRainLine } from "@/components/weather/NearTermRainLine";
import { WeatherPrecipMapPreview } from "@/components/weather/WeatherPrecipMapPreview";

export function WeatherTimeSpanPopover({
  weather,
  open,
  onClose,
}: {
  weather: WeatherForTimeSpan;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="weather-popover" role="dialog" aria-modal="false">
      <button
        type="button"
        className="weather-popover__close"
        aria-label="Close weather details"
        onClick={onClose}
      >
        Close
      </button>
      <h3>{weather.headline}</h3>
      <p>{weather.plainLanguageSummary}</p>
      <NearTermRainLine signal={weather.nearTermRain} />
      <WeatherPrecipMapPreview precipMap={weather.precipMap} />
      {weather.isStale && <p className="weather-popover__stale">Forecast is stale.</p>}
      {weather.nwsAlerts.length > 0 && (
        <div className="weather-popover__alerts">
          {weather.nwsAlerts.map((alert) => (
            <p key={alert.id}>
              <strong>{alert.event}</strong> {alert.headline}
            </p>
          ))}
        </div>
      )}
      <dl className="weather-popover__metrics">
        {weather.tempF != null && weather.tempC != null && (
          <div>
            <dt>Temperature</dt>
            <dd>{formatTempDual(weather.tempF, weather.tempC)}</dd>
          </div>
        )}
        {formatWindDual(weather.windMph, weather.windKph) && (
          <div>
            <dt>Wind</dt>
            <dd>{formatWindDual(weather.windMph, weather.windKph)}</dd>
          </div>
        )}
        {weather.rainChancePct != null && (
          <div>
            <dt>Rain chance</dt>
            <dd>{weather.rainChancePct}%</dd>
          </div>
        )}
      </dl>
      <div className="weather-popover__hours">
        {weather.hourlyBreakdown.map((hour) => (
          <div key={hour.time} className="weather-popover__hour">
            <time dateTime={hour.time}>{new Date(hour.time).toLocaleTimeString()}</time>
            <span>{hour.conditionText}</span>
            <span>{formatTempDual(hour.tempF, hour.tempC)}</span>
            {formatWindDual(hour.windMph, hour.windKph) && (
              <span>{formatWindDual(hour.windMph, hour.windKph)}</span>
            )}
            {formatPrecipDual(hour.precipIn, hour.precipMm) && (
              <span>{formatPrecipDual(hour.precipIn, hour.precipMm)}</span>
            )}
          </div>
        ))}
      </div>
      <WeatherFreshnessLine weather={weather} className="weather-popover__timestamp" />
    </div>
  );
}
