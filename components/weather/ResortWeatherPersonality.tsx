import type { ResortWeatherProfile } from "@/lib/weather/types";

export function ResortWeatherPersonality({
  profile,
}: {
  profile: ResortWeatherProfile;
}) {
  return (
    <section className="resort-weather-personality">
      <h2>Weather fit at this resort</h2>
      <p>{profile.rainyDaySummary}</p>
      <p>{profile.heatDaySummary}</p>
      <p>{profile.stormDaySummary}</p>
    </section>
  );
}
