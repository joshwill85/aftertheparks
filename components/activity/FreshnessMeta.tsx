import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/daypart";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const FALLBACK_SOURCE = "https://aftertheparks.com/data-sources";

interface FreshnessMetaProps {
  freshness: ActivityOccurrence["freshness"];
  variant?: "day" | "night";
  className?: string;
}

function formatVerifiedDate(iso: string): string {
  try {
    return formatInTimeZone(new Date(iso), TIMEZONE, "MMM d, yyyy");
  } catch {
    return "recently";
  }
}

export function FreshnessMeta({
  freshness,
  variant = "day",
  className = "",
}: FreshnessMetaProps) {
  const lastVerified = freshness.lastVerified;
  const sourceUrl = freshness.sourceUrl || FALLBACK_SOURCE;
  const label =
    freshness.badge === "verified" ? "Verified" : "Updated";

  return (
    <div
      className={`freshness-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${className}`}
    >
      <span
        className={
          variant === "night"
            ? "text-white/55"
            : "text-[var(--color-muted)]"
        }
      >
        {label} {formatVerifiedDate(lastVerified)}
      </span>
      <span
        className={
          variant === "night" ? "text-white/35" : "text-[var(--color-muted)]/60"
        }
        aria-hidden
      >
        ·
      </span>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          variant === "night"
            ? "font-semibold text-[var(--starlight)] underline-offset-2 hover:text-[var(--lantern)] hover:underline"
            : "font-semibold text-[var(--lagoon-deep)] underline-offset-2 hover:text-[var(--lagoon)] hover:underline"
        }
      >
        Official schedule
      </a>
    </div>
  );
}
