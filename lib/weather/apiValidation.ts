import type { WeatherGuidanceBatchOccurrence } from "@/lib/weather/providerRouter";

function parseWeatherDateParam(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

export function validateWeatherGuidanceSearchParams(searchParams: URLSearchParams) {
  return {
    locationKey: searchParams.get("locationKey"),
    resortSlug: searchParams.get("resortSlug"),
    startsAt: parseWeatherDateParam(searchParams.get("startsAt")),
    endsAt: parseWeatherDateParam(searchParams.get("endsAt")),
    includeNearTerm: searchParams.get("includeNearTerm") !== "false",
    includePrecipMap: searchParams.get("includePrecipMap") !== "false",
  };
}

export function validateWeatherGuidanceBatchRequest(
  value: unknown
): WeatherGuidanceBatchOccurrence[] {
  const body = value as { occurrences?: WeatherGuidanceBatchOccurrence[] };
  const occurrences = Array.isArray(body?.occurrences) ? body.occurrences : [];
  return occurrences
    .filter((occurrence) => typeof occurrence.id === "string")
    .filter((occurrence) => typeof occurrence.startsAt === "string")
    .filter((occurrence) => !Number.isNaN(new Date(occurrence.startsAt).getTime()))
    .slice(0, 150);
}

export function validateWeatherGuidanceBatchOptions(value: unknown) {
  const body = value as {
    includeNearTerm?: boolean;
    includePrecipMap?: boolean;
  };
  return {
    includeNearTerm: body.includeNearTerm !== false,
    includePrecipMap: body.includePrecipMap === true,
  };
}
