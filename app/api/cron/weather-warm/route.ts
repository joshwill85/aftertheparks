import { NextResponse } from "next/server";
import { getCachedNwsAlerts, getCachedWeatherSnapshot } from "@/lib/weather/cache";
import { WEATHER_LOCATIONS } from "@/lib/weather/locations";
import { isWeatherApiAvailable } from "@/lib/weather/forecastHorizon";
import { trackWeatherEvent } from "@/lib/weather/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.WEATHER_WARM_CACHE_ENABLED === "false") {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const locations = Object.values(WEATHER_LOCATIONS);
  const weatherApiEnabled = isWeatherApiAvailable();
  const nwsEnabled = process.env.NWS_ALERTS_ENABLED !== "false" && Boolean(process.env.NWS_USER_AGENT);
  const results = await Promise.allSettled(
    locations.flatMap((location) => [
      weatherApiEnabled
        ? getCachedWeatherSnapshot({ location, provider: "weatherapi" })
        : Promise.resolve(null),
      nwsEnabled ? getCachedNwsAlerts({ location }) : Promise.resolve([]),
    ])
  );
  const failures = results.filter((result) => result.status === "rejected").length;

  trackWeatherEvent("weather_warm_cache_result", {
    locationCount: locations.length,
    failures,
    weatherApiEnabled,
    nwsEnabled,
  });

  return NextResponse.json({
    ok: failures === 0,
    locationCount: locations.length,
    failures,
    weatherApiEnabled,
    nwsEnabled,
  });
}
