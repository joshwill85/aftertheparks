import Link from "next/link";
import type { ResortSummary } from "@/lib/types/occurrence";
import { cn, formatResortTier } from "@/lib/utils";

const TIER_GRADIENTS: Record<string, string> = {
  value:
    "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.72), transparent 34%), linear-gradient(145deg, #fdb94e, #ff9c6b)",
  moderate:
    "radial-gradient(circle at 70% 15%, rgba(255,255,255,0.58), transparent 38%), linear-gradient(145deg, #16a6b6, #08798a)",
  deluxe:
    "radial-gradient(circle at 25% 80%, rgba(255,200,87,0.38), transparent 42%), linear-gradient(145deg, #071a26 0%, #102d3a 55%, #16a6b6 100%)",
  deluxe_villa:
    "radial-gradient(circle at 60% 30%, rgba(255,255,255,0.55), transparent 35%), linear-gradient(145deg, #ffc857, #08798a)",
  campground:
    "radial-gradient(circle at 40% 25%, rgba(255,255,255,0.52), transparent 32%), linear-gradient(145deg, #27724b, #fdb94e)",
};

export function getResortTierGradient(category: string): string {
  return TIER_GRADIENTS[category] ?? TIER_GRADIENTS.moderate;
}

interface ResortCardProps {
  resort: ResortSummary;
  tonightCount?: number;
}

export function ResortCard({ resort, tonightCount }: ResortCardProps) {
  const tierLabel = formatResortTier(resort.category);
  const isDarkTier = resort.category === "deluxe";

  return (
    <article className="group flex flex-col overflow-hidden rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg">
      <div
        className="relative flex min-h-[108px] items-end p-4"
        style={{ background: getResortTierGradient(resort.category) }}
      >
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
            isDarkTier
              ? "bg-black/35 text-white/95"
              : "bg-white/55 text-[var(--brand-ink)]"
          )}
        >
          {tierLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-[var(--accent)]">
          {resort.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
          <span>
            {resort.activityCount}{" "}
            {resort.activityCount === 1 ? "activity" : "activities"}
          </span>
          {tonightCount != null && tonightCount > 0 && (
            <span className="font-semibold text-[var(--color-lantern)]">
              {tonightCount} tonight
            </span>
          )}
        </div>

        <div className="mt-4">
          <Link
            href={`/resorts/${resort.slug}`}
            className="btn-secondary inline-flex min-h-11 items-center rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 text-sm font-bold hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            View resort
          </Link>
        </div>
      </div>
    </article>
  );
}
