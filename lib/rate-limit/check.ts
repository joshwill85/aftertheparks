import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

export async function consumeRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isSupabaseConfigured()) {
    return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests };
  }

  const client = createServiceClient();
  if (!client) {
    return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests };
  }

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error || !data?.length) {
    // Fail open so a DB hiccup does not block guests.
    console.warn("rate-limit-check-failed", { bucketKey, error: error?.message });
    return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests };
  }

  const row = data[0] as {
    allowed: boolean;
    retry_after_seconds: number;
    remaining: number;
  };

  return {
    allowed: row.allowed,
    retryAfterSeconds: row.retry_after_seconds ?? 0,
    remaining: row.remaining ?? 0,
  };
}

export async function enforceRateLimits(
  checks: Array<{
    bucketKey: string;
    maxRequests: number;
    windowSeconds: number;
  }>
): Promise<RateLimitResult> {
  let tightest: RateLimitResult = {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Number.MAX_SAFE_INTEGER,
  };

  for (const check of checks) {
    const result = await consumeRateLimit(
      check.bucketKey,
      check.maxRequests,
      check.windowSeconds
    );
    if (!result.allowed) {
      return result;
    }
    if (result.remaining < tightest.remaining) {
      tightest = result;
    }
  }

  return tightest;
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  const retry = Math.max(1, retryAfterSeconds);
  return NextResponse.json(
    {
      error: "Too many requests",
      message: "You're moving a little fast — please wait a moment and try again.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retry),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function rateLimitOrNull(
  checks: Array<{
    bucketKey: string;
    maxRequests: number;
    windowSeconds: number;
  }>
): Promise<NextResponse | null> {
  const result = await enforceRateLimits(checks);
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSeconds);
  }
  return null;
}
