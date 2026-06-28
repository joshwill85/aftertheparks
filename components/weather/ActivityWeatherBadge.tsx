import type { ActivityWeatherFit } from "@/lib/weather/types";

const LABELS: Record<ActivityWeatherFit, string> = {
  indoor: "Indoor",
  covered: "Covered",
  mostly_indoor: "Mostly indoor",
  outdoor_shaded: "Heat-friendly",
  outdoor_uncovered: "Weather-dependent",
  pool: "Pool/lightning sensitive",
  campfire: "May pause for storms",
  outdoor_movie: "Rain backup",
  boat_dependent: "Boat caution",
  skyliner_dependent: "Skyliner caution",
  walking_heavy: "Walking-heavy",
  low_walking: "Low walking",
  heat_sensitive: "Heat-sensitive",
  storm_sensitive: "May pause for storms",
};

export function ActivityWeatherBadge({ fit }: { fit: ActivityWeatherFit }) {
  return <span className="activity-weather-badge">{LABELS[fit]}</span>;
}
