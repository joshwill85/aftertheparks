import { NextResponse } from "next/server";
import { getCachedNwsAlerts, getCachedNwsAlertsForAllWdw, getCachedWeatherSnapshot } from "@/lib/weather/cache";
import { getWeatherLocation, parseWeatherLocationKey } from "@/lib/weather/locations";
import { buildWeatherGuidanceForTimeSpan } from "@/lib/weather/guidance";
import {
  validateWeatherGuidanceBatchOptions,
  validateWeatherGuidanceBatchRequest,
} from "@/lib/weather/apiValidation";
import { getWeatherApiPrecipMapContext } from "@/lib/weather/precipMap";
import {
  chooseWeatherProviderForTimeSpan,
  groupOccurrencesByWeatherLocation,
} from "@/lib/weather/providerRouter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const occurrences = validateWeatherGuidanceBatchRequest(body);
  const options = validateWeatherGuidanceBatchOptions(body);
  const grouped = groupOccurrencesByWeatherLocation(occurrences);
  const now = new Date();
  const weatherById: Record<string, ReturnType<typeof buildWeatherGuidanceForTimeSpan>> = {};

  for (const [locationKey, group] of Object.entries(grouped)) {
    if (group.length === 0) continue;
    const location = getWeatherLocation(parseWeatherLocationKey(locationKey));
    const providers = new Set(
      group.map((occurrence) =>
        chooseWeatherProviderForTimeSpan({
          now,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
        }).provider
      )
    );

    const alertsResult = await Promise.allSettled([
      location.key === "all_wdw"
        ? getCachedNwsAlertsForAllWdw()
        : getCachedNwsAlerts({ location }),
    ]);
    const alertState =
      alertsResult[0]?.status === "fulfilled"
        ? { status: "available" as const, alerts: alertsResult[0].value }
        : { status: "unavailable" as const, alerts: [] };

    const snapshots = new Map<string, Awaited<ReturnType<typeof getCachedWeatherSnapshot>>>();
    await Promise.all(
      Array.from(providers).map(async (provider) => {
        const result = await Promise.allSettled([
          getCachedWeatherSnapshot({ location, provider }),
        ]);
        snapshots.set(
          provider,
          result[0]?.status === "fulfilled" ? result[0].value : null
        );
      })
    );

    for (const occurrence of group) {
      const selection = chooseWeatherProviderForTimeSpan({
        now,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
      });
      const snapshot = snapshots.get(selection.provider) ?? null;
      weatherById[occurrence.id] = {
        ...buildWeatherGuidanceForTimeSpan({
          locationKey: location.key,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          snapshot,
          alerts: alertState.alerts,
          officialAlertStatus: alertState.status,
          includeNearTerm: options.includeNearTerm,
          precipMap: options.includePrecipMap
            ? getWeatherApiPrecipMapContext({ location, now })
            : undefined,
        }),
        forecastStatus:
          selection.provider === "none"
            ? "not_available_yet"
            : snapshot
              ? "available"
              : "unavailable",
      } satisfies ReturnType<typeof buildWeatherGuidanceForTimeSpan>;
    }
  }

  return NextResponse.json({ weatherById });
}
