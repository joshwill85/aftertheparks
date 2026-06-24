import type { NextResponse } from "next/server";
import {
  getClientIp,
  rateLimitOrNull,
  type RateLimitResult,
} from "@/lib/rate-limit/check";
import {
  hashRateLimitValue,
  rateLimitBucket,
  RATE_LIMITS,
  type RateLimitScope,
} from "@/lib/rate-limit/config";

interface GuardInput {
  request: Request;
  scope: RateLimitScope;
  userId?: string | null;
  email?: string | null;
}

function checksForScope(input: GuardInput) {
  const ip = getClientIp(input.request);
  const checks: Array<{
    bucketKey: string;
    maxRequests: number;
    windowSeconds: number;
  }> = [];

  switch (input.scope) {
    case "plan-email": {
      checks.push({
        bucketKey: rateLimitBucket("plan-email", "ip", ip),
        ...RATE_LIMITS.emailPerIp,
      });
      if (input.email) {
        checks.push({
          bucketKey: rateLimitBucket(
            "plan-email",
            "email",
            hashRateLimitValue(input.email)
          ),
          ...RATE_LIMITS.emailPerAddress,
        });
      }
      break;
    }
    case "plan-mutation": {
      if (input.userId) {
        checks.push({
          bucketKey: rateLimitBucket("plan-mutation", "user", input.userId),
          ...RATE_LIMITS.planMutationPerUser,
        });
      }
      checks.push({
        bucketKey: rateLimitBucket("plan-mutation", "ip", ip),
        ...RATE_LIMITS.planMutationPerIp,
      });
      break;
    }
    case "plan-share": {
      if (input.userId) {
        checks.push({
          bucketKey: rateLimitBucket("plan-share", "user", input.userId),
          ...RATE_LIMITS.planSharePerUser,
        });
      }
      break;
    }
    case "plan-copy": {
      if (input.userId) {
        checks.push({
          bucketKey: rateLimitBucket("plan-copy", "user", input.userId),
          ...RATE_LIMITS.planCopyPerUser,
        });
      }
      checks.push({
        bucketKey: rateLimitBucket("plan-copy", "ip", ip),
        ...RATE_LIMITS.planCopyPerIp,
      });
      break;
    }
    case "public-share-read": {
      checks.push({
        bucketKey: rateLimitBucket("public-share-read", "ip", ip),
        ...RATE_LIMITS.publicShareReadPerIp,
      });
      break;
    }
    case "corrections": {
      checks.push({
        bucketKey: rateLimitBucket("corrections", "ip", ip),
        ...RATE_LIMITS.correctionsPerIp,
      });
      break;
    }
    case "search": {
      checks.push({
        bucketKey: rateLimitBucket("search", "ip", ip),
        ...RATE_LIMITS.searchPerIp,
      });
      break;
    }
  }

  return checks;
}

export async function guardRateLimit(
  input: GuardInput
): Promise<NextResponse | null> {
  return rateLimitOrNull(checksForScope(input));
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  if (!result.allowed) return {};
  return {
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
