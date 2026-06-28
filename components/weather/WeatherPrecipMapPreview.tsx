import type { WeatherPrecipMapContext } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

export function WeatherPrecipMapPreview({
  precipMap,
  className,
}: {
  precipMap?: WeatherPrecipMapContext;
  className?: string;
}) {
  const frame = precipMap?.frames[0];
  if (!precipMap || !frame) return null;

  return (
    <figure className={cn("weather-precip-map", className)}>
      <div
        className="weather-precip-map__tile"
        style={{ backgroundImage: `url(${frame.previewTileUrl})` }}
        aria-hidden
      />
      <figcaption>
        <strong>{precipMap.label}</strong>
        <span>{precipMap.description}</span>
      </figcaption>
    </figure>
  );
}
