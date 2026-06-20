"use client";

import { useState } from "react";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

interface FreshnessBadgeProps {
  freshness: ActivityOccurrence["freshness"];
}

export function FreshnessBadge({ freshness }: FreshnessBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isVerified = freshness.badge === "verified";

  return (
    <span className="relative inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isVerified ? "bg-[var(--color-porch-light)] porch-flicker" : "bg-[var(--color-citrus)]"
        }`}
        aria-hidden
      />
      <button
        type="button"
        className="underline-offset-2 hover:underline"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        {isVerified ? "Verified" : "Check schedule"}
      </button>
      {showTooltip && process.env.NEXT_PUBLIC_EASTER_EGGS === "true" && (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 mb-1 whitespace-nowrap rounded bg-[var(--color-midnight)] px-2 py-1 text-[var(--color-porch-light)]"
        >
          Porch light&apos;s on
        </span>
      )}
      {freshness.sourceUrl && (
        <a
          href={freshness.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sr-only"
        >
          Source
        </a>
      )}
    </span>
  );
}
