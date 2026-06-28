import "server-only";

import type { WeatherAlert, WeatherLocation } from "@/lib/weather/types";
import { trackWeatherEvent } from "@/lib/weather/analytics";

type NwsAlertFeature = {
  id?: string;
  properties?: {
    id?: string;
    event?: string;
    headline?: string;
    severity?: WeatherAlert["severity"];
    urgency?: WeatherAlert["urgency"];
    certainty?: WeatherAlert["certainty"];
    effective?: string;
    expires?: string;
    areaDesc?: string;
    instruction?: string;
    description?: string;
  };
};

export function normalizeNwsAlerts(payload: { features?: NwsAlertFeature[] }): WeatherAlert[] {
  return (payload.features ?? []).map((feature) => {
    const properties = feature.properties ?? {};
    return {
      provider: "nws",
      id: properties.id ?? feature.id ?? crypto.randomUUID(),
      event: properties.event ?? "Weather Alert",
      headline: properties.headline ?? properties.event ?? "Weather Alert",
      severity: properties.severity ?? "Unknown",
      urgency: properties.urgency ?? "Unknown",
      certainty: properties.certainty ?? "Unknown",
      effective: properties.effective ?? new Date(0).toISOString(),
      expires: properties.expires ?? new Date(0).toISOString(),
      areaDesc: properties.areaDesc,
      instruction: properties.instruction,
      description: properties.description,
      sourceUrl: feature.id,
    };
  });
}

export async function fetchNwsAlerts({
  location,
  userAgent = process.env.NWS_USER_AGENT,
}: {
  location: WeatherLocation;
  userAgent?: string;
}): Promise<WeatherAlert[]> {
  if (!userAgent) throw new Error("NWS_USER_AGENT is required for NWS alert fetch");
  const url = new URL("https://api.weather.gov/alerts/active");
  url.searchParams.set("point", `${location.lat},${location.lon}`);
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": userAgent,
    },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    trackWeatherEvent("weather_provider_error", {
      provider: "nws_alerts",
      status: response.status,
      locationKey: location.key,
    });
    throw new Error(`NWS alerts failed with ${response.status}`);
  }
  trackWeatherEvent("nws_alert_banner_view", {
    provider: "nws_alerts",
    locationKey: location.key,
  });
  return normalizeNwsAlerts(await response.json());
}
