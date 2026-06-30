import { NextResponse, type NextResponse as NextResponseType } from "next/server";
import { CACHE_SECONDS } from "@/lib/cache/tags";

export type PublicApiCachePolicy = "evergreen" | "timeRelative" | "weather";

type HeaderValue = Record<string, string>;

const PUBLIC_API_POLICIES: Record<PublicApiCachePolicy, HeaderValue> = {
  evergreen: {
    "Cache-Control": `public, max-age=${CACHE_SECONDS.evergreenBrowser}`,
    "CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.evergreen}, stale-while-revalidate=${CACHE_SECONDS.evergreenSWR}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.evergreen}, stale-while-revalidate=${CACHE_SECONDS.evergreenSWR}`,
  },
  timeRelative: {
    "Cache-Control": `public, max-age=${CACHE_SECONDS.timeRelativeBrowser}`,
    "CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.timeRelative}, stale-while-revalidate=${CACHE_SECONDS.timeRelativeSWR}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.timeRelative}, stale-while-revalidate=${CACHE_SECONDS.timeRelativeSWR}`,
  },
  weather: {
    "Cache-Control": `public, max-age=${CACHE_SECONDS.weatherBrowser}`,
    "CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.weather}, stale-while-revalidate=${CACHE_SECONDS.weatherSWR}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS.weather}, stale-while-revalidate=${CACHE_SECONDS.weatherSWR}`,
  },
};

export function publicCacheHeaders(policy: PublicApiCachePolicy): HeaderValue {
  return PUBLIC_API_POLICIES[policy];
}

export function privateNoStoreHeaders(): HeaderValue {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "private, no-store",
    "Vercel-CDN-Cache-Control": "private, no-store",
  };
}

export function publicCacheJson<T>(
  body: T,
  policy: PublicApiCachePolicy,
  init: ResponseInit = {}
): NextResponseType<T> {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...publicCacheHeaders(policy),
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  });
}

export function privateNoStoreJson<T>(
  body: T,
  init: ResponseInit = {}
): NextResponseType<T> {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...privateNoStoreHeaders(),
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  });
}
