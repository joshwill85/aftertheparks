import { createHash } from "crypto";

/** Fixed-window limits tuned for real guests; tight enough to slow abuse. */
export const RATE_LIMITS = {
  /** Magic-link / claim-email requests */
  emailPerIp: { maxRequests: 12, windowSeconds: 3600 },
  emailPerAddress: { maxRequests: 6, windowSeconds: 3600 },

  /** Plan saves, removes, renames */
  planMutationPerUser: { maxRequests: 180, windowSeconds: 3600 },
  planMutationPerIp: { maxRequests: 240, windowSeconds: 3600 },

  /** Share link create / rotate / revoke */
  planSharePerUser: { maxRequests: 40, windowSeconds: 86400 },

  /** Copy items from a shared plan */
  planCopyPerUser: { maxRequests: 30, windowSeconds: 3600 },
  planCopyPerIp: { maxRequests: 40, windowSeconds: 3600 },

  /** Public read-only share page API */
  publicShareReadPerIp: { maxRequests: 120, windowSeconds: 60 },

  /** User-submitted corrections */
  correctionsPerIp: { maxRequests: 20, windowSeconds: 3600 },

  /** Search API — generous for typing / refinement */
  searchPerIp: { maxRequests: 180, windowSeconds: 60 },
} as const;

export type RateLimitScope =
  | "plan-email"
  | "plan-mutation"
  | "plan-share"
  | "plan-copy"
  | "public-share-read"
  | "corrections"
  | "search";

export function hashRateLimitValue(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);
}

export function rateLimitBucket(
  scope: string,
  dimension: "ip" | "user" | "email",
  value: string
): string {
  return `${scope}:${dimension}:${value}`;
}
