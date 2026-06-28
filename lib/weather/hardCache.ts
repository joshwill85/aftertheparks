import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { WeatherAlert, WeatherLocation, WeatherProviderId, WeatherSnapshot } from "@/lib/weather/types";
import { DEFAULT_WEATHER_RISK } from "@/lib/weather/types";
import { fetchNwsAlerts } from "@/lib/weather/nws";
import { fetchNwsForecastSnapshot } from "@/lib/weather/nwsForecast";
import { fetchVisualCrossingForecast } from "@/lib/weather/visualcrossing";
import { fetchWeatherApiForecast } from "@/lib/weather/weatherapi";

export const weatherCacheKeys = {
  weatherApi3Day(locationKey: string) {
    return `weather:v1:weatherapi:${locationKey}:days3:aqi1:alerts0`;
  },
  nwsAlerts(locationKey: string) {
    return `weather:v1:nws-alerts:${locationKey}`;
  },
  nwsPoint(locationKey: string, lat: number, lon: number) {
    return `weather:v1:nws-point:${locationKey}:${lat},${lon}`;
  },
  nwsHourly(locationKey: string, gridId: string) {
    return `weather:v1:nws-hourly:${locationKey}:${gridId}`;
  },
  nwsPeriod(locationKey: string, gridId: string) {
    return `weather:v1:nws-period:${locationKey}:${gridId}`;
  },
  visualCrossingDaily15(locationKey: string) {
    return `weather:v1:visualcrossing:${locationKey}:days15:include-days`;
  },
};

export type WeatherQuotaMode = "normal" | "conserve" | "critical";

export const WEATHER_QUOTA_MODES = {
  normal: {
    weatherApiTtlSeconds: 15 * 60,
    visualCrossingTtlSeconds: 6 * 60 * 60,
    backgroundPrefetch: true,
  },
  conserve: {
    weatherApiTtlSeconds: 30 * 60,
    visualCrossingTtlSeconds: 12 * 60 * 60,
    backgroundPrefetch: false,
  },
  critical: {
    weatherApiTtlSeconds: 60 * 60,
    visualCrossingTtlSeconds: 24 * 60 * 60,
    backgroundPrefetch: false,
    weatherApiDisabledForNonCriticalSurfaces: true,
  },
} as const;

const inflight = new Map<string, Promise<unknown>>();
const memorySnapshots = new Map<string, WeatherSnapshot>();
const memoryAlerts = new Map<string, WeatherAlertCacheEntry>();
const NWS_ALERT_CACHE_TTL_MS = 60 * 1000;

type WeatherSnapshotRow = {
  cache_key: string;
  location_key: string;
  provider: string;
  confidence: string;
  fetched_at: string;
  expires_at: string;
  stale_after: string;
  is_stale: boolean;
  payload: WeatherSnapshot;
  attribution?: unknown;
};

type WeatherAlertRow = {
  provider_alert_id: string;
  payload: WeatherAlert;
};

type WeatherAlertCacheStateRow = {
  cache_key: string;
  location_key: string;
  fetched_at: string;
  stale_after: string;
  active_alert_count: number;
  status: "fresh" | "stale" | "provider_error";
};

type WeatherAlertCacheEntry = {
  alerts: WeatherAlert[];
  fetchedAt: string;
  staleAfter: string;
};

function createWeatherServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isDurableWeatherCacheConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function isStale(fetchedAt: string, staleAfter: string, now = new Date()): boolean {
  void fetchedAt;
  return new Date(staleAfter).getTime() <= now.getTime();
}

function isUsableCachedSnapshot(snapshot: WeatherSnapshot, now = new Date()): boolean {
  return new Date(snapshot.staleAfter).getTime() > now.getTime();
}

function isUsableAlertCache(entry: WeatherAlertCacheEntry, now = new Date()): boolean {
  return new Date(entry.staleAfter).getTime() > now.getTime();
}

function createAlertCacheEntry(alerts: WeatherAlert[], now = new Date()): WeatherAlertCacheEntry {
  return {
    alerts,
    fetchedAt: now.toISOString(),
    staleAfter: new Date(now.getTime() + NWS_ALERT_CACHE_TTL_MS).toISOString(),
  };
}

function reviveSnapshot(snapshot: WeatherSnapshot, now = new Date()): WeatherSnapshot {
  return {
    ...snapshot,
    isStale: isStale(snapshot.fetchedAt, snapshot.staleAfter, now),
  };
}

export function filterActiveAlerts(alerts: WeatherAlert[], now = new Date()) {
  return alerts.filter((alert) => {
    const effective = new Date(alert.effective).getTime();
    const expires = new Date(alert.expires).getTime();
    const t = now.getTime();
    return effective <= t && expires >= t;
  });
}

export function dedupeAlertsByProviderAlertId(
  results: Array<PromiseSettledResult<WeatherAlert[]>>
): WeatherAlert[] {
  const byId = new Map<string, WeatherAlert>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const alert of result.value) {
      byId.set(alert.id, alert);
    }
  }
  return Array.from(byId.values());
}

function snapshotCacheKey(location: WeatherLocation, provider: WeatherProviderId) {
  if (provider === "weatherapi") return weatherCacheKeys.weatherApi3Day(location.key);
  if (provider === "visual_crossing") return weatherCacheKeys.visualCrossingDaily15(location.key);
  return weatherCacheKeys.nwsHourly(location.key, "default");
}

function providerAvailable(provider: WeatherProviderId): boolean {
  if (provider === "weatherapi") return Boolean(process.env.WEATHERAPI_KEY);
  if (provider === "visual_crossing") return Boolean(process.env.VISUAL_CROSSING_KEY);
  if (provider === "nws_forecast") return Boolean(process.env.NWS_USER_AGENT);
  return false;
}

async function readDurableSnapshot(cacheKey: string, now = new Date()): Promise<WeatherSnapshot | null> {
  const supabase = createWeatherServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weather_snapshots")
    .select("cache_key, location_key, provider, confidence, fetched_at, expires_at, stale_after, is_stale, payload, attribution")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  const row = data as WeatherSnapshotRow | null;
  if (error || !row?.payload) return null;
  const snapshot = reviveSnapshot(row.payload, now);
  if (!isUsableCachedSnapshot(snapshot, now)) return null;
  memorySnapshots.set(cacheKey, snapshot);
  return snapshot;
}

async function writeDurableSnapshot(cacheKey: string, snapshot: WeatherSnapshot): Promise<void> {
  const supabase = createWeatherServiceClient();
  if (!supabase) return;

  await supabase.from("weather_snapshots").upsert(
    {
      cache_key: cacheKey,
      location_key: snapshot.locationKey,
      provider: snapshot.provider,
      confidence: snapshot.confidence,
      fetched_at: snapshot.fetchedAt,
      expires_at: snapshot.expiresAt,
      stale_after: snapshot.staleAfter,
      is_stale: snapshot.isStale,
      payload: snapshot,
      attribution: snapshot.attribution ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" }
  );
}

async function readDurableAlertState(cacheKey: string): Promise<WeatherAlertCacheStateRow | null> {
  const supabase = createWeatherServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weather_alert_cache_state")
    .select("cache_key, location_key, fetched_at, stale_after, active_alert_count, status")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;
  return data as WeatherAlertCacheStateRow;
}

async function readDurableAlerts(location: WeatherLocation, now = new Date()): Promise<WeatherAlertCacheEntry | null> {
  const supabase = createWeatherServiceClient();
  if (!supabase) return null;
  const key = weatherCacheKeys.nwsAlerts(location.key);
  const state = await readDurableAlertState(key);
  if (!state || new Date(state.stale_after).getTime() <= now.getTime()) return null;

  const { data, error } = await supabase
    .from("weather_alerts")
    .select("provider_alert_id, payload")
    .eq("location_key", location.key)
    .gte("expires", now.toISOString())
    .order("effective", { ascending: false })
    .returns<WeatherAlertRow[]>();

  if (error || !data) return null;
  const alerts = filterActiveAlerts(data.map((row) => row.payload), now);
  const entry = {
    alerts,
    fetchedAt: state.fetched_at,
    staleAfter: state.stale_after,
  };
  memoryAlerts.set(key, entry);
  return entry;
}

async function writeDurableAlerts(
  location: WeatherLocation,
  entry: WeatherAlertCacheEntry
): Promise<void> {
  const supabase = createWeatherServiceClient();
  if (!supabase) return;

  if (entry.alerts.length > 0) {
    await supabase.from("weather_alerts").upsert(
      entry.alerts.map((alert) => ({
        provider_alert_id: alert.id,
        location_key: location.key,
        event: alert.event,
        headline: alert.headline,
        severity: alert.severity,
        urgency: alert.urgency,
        certainty: alert.certainty,
        effective: alert.effective,
        expires: alert.expires,
        area_desc: alert.areaDesc ?? null,
        instruction: alert.instruction ?? null,
        description: alert.description ?? null,
        source_url: alert.sourceUrl ?? null,
        payload: alert,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "provider_alert_id" }
    );
  }

  await supabase.from("weather_alert_cache_state").upsert(
    {
      cache_key: weatherCacheKeys.nwsAlerts(location.key),
      location_key: location.key,
      fetched_at: entry.fetchedAt,
      stale_after: entry.staleAfter,
      active_alert_count: entry.alerts.length,
      status: "fresh",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" }
  );
}

function placeholderSnapshot(location: WeatherLocation, provider: Exclude<WeatherProviderId, "none" | "nws_alerts">): WeatherSnapshot {
  const now = new Date();
  return {
    locationKey: location.key,
    provider,
    confidence:
      provider === "weatherapi"
        ? "near_term_hourly"
        : provider === "visual_crossing"
          ? "long_range_planning"
          : "official_7_day",
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    staleAfter: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    isStale: false,
    risk: DEFAULT_WEATHER_RISK,
    hourly: [],
    daily: [],
    attribution:
      provider === "visual_crossing"
        ? {
            provider: "visual_crossing",
            label: "Visual Crossing",
            required: true,
            href: "https://www.visualcrossing.com/weather-api/",
          }
        : undefined,
  };
}

async function fetchProviderSnapshot({
  location,
  provider,
}: {
  location: WeatherLocation;
  provider: Exclude<WeatherProviderId, "none" | "nws_alerts">;
}): Promise<WeatherSnapshot> {
  if (!providerAvailable(provider)) return placeholderSnapshot(location, provider);
  if (provider === "weatherapi") return fetchWeatherApiForecast({ location });
  if (provider === "visual_crossing") return fetchVisualCrossingForecast({ location });
  return fetchNwsForecastSnapshot({ location });
}

export async function getCachedWeatherSnapshot({
  location,
  provider,
}: {
  location: WeatherLocation;
  provider: WeatherProviderId;
}): Promise<WeatherSnapshot | null> {
  if (provider === "none" || provider === "nws_alerts") return null;
  const key = snapshotCacheKey(location, provider);
  const now = new Date();
  const cached = memorySnapshots.get(key);
  if (cached && isUsableCachedSnapshot(cached, now)) return reviveSnapshot(cached, now);

  const durable = await readDurableSnapshot(key, now);
  if (durable) return durable;

  return singleFlight(key, async () => {
    const concreteProvider = provider as Exclude<WeatherProviderId, "none" | "nws_alerts">;
    const snapshot = await fetchProviderSnapshot({ location, provider: concreteProvider });
    memorySnapshots.set(key, snapshot);
    if (providerAvailable(concreteProvider)) {
      await writeDurableSnapshot(key, snapshot);
    }
    return snapshot;
  });
}

export async function getCachedNwsAlerts({
  location,
}: {
  location: WeatherLocation;
}): Promise<WeatherAlert[]> {
  const key = weatherCacheKeys.nwsAlerts(location.key);
  const now = new Date();
  const cached = memoryAlerts.get(key);
  if (cached && isUsableAlertCache(cached, now)) {
    return filterActiveAlerts(cached.alerts, now);
  }
  const durable = await readDurableAlerts(location, now);
  if (durable) return filterActiveAlerts(durable.alerts, now);
  return singleFlight(key, async () => {
    const alerts = process.env.NWS_USER_AGENT ? await fetchNwsAlerts({ location }) : [];
    const entry = createAlertCacheEntry(alerts, new Date());
    memoryAlerts.set(key, entry);
    if (process.env.NWS_USER_AGENT) {
      await writeDurableAlerts(location, entry);
    }
    return filterActiveAlerts(entry.alerts);
  });
}
