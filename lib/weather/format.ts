export type UnitDisplayPreference = "fahrenheit_first" | "celsius_first";

export function formatTempDual(
  tempF: number,
  tempC: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string {
  const fahrenheit = `${Math.round(tempF)}°F`;
  const celsius = `${Math.round(tempC)}°C`;
  return preference === "celsius_first"
    ? `${celsius} / ${fahrenheit}`
    : `${fahrenheit} / ${celsius}`;
}

export function formatWindDual(
  mph?: number,
  kph?: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string | null {
  if (mph == null || kph == null) return null;
  const imperial = `${Math.round(mph)} mph`;
  const metric = `${Math.round(kph)} km/h`;
  return preference === "celsius_first"
    ? `${metric} / ${imperial}`
    : `${imperial} / ${metric}`;
}

export function formatPrecipDual(
  inches?: number,
  mm?: number,
  preference: UnitDisplayPreference = "fahrenheit_first"
): string | null {
  if (inches == null || mm == null) return null;
  const imperial = `${inches.toFixed(2)} in`;
  const metric = `${Math.round(mm)} mm`;
  return preference === "celsius_first"
    ? `${metric} / ${imperial}`
    : `${imperial} / ${metric}`;
}
