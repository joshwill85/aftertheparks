import Link from "next/link";
import type { ResortSummary } from "@/lib/types/occurrence";
import {
  formatResortArea,
  getResortInitial,
  getResortTagline,
} from "@/lib/resorts/display";
import {
  hasResortStoryIcon,
  ResortStoryIcon,
} from "@/components/resort/ResortStoryIcon";
import { cn, formatResortTier } from "@/lib/utils";

const TIER_GRADIENTS: Record<string, string> = {
  value:
    "radial-gradient(circle at 28% 18%, rgba(255,255,255,0.78), transparent 38%), linear-gradient(145deg, #ffcf6b 0%, #fdb94e 42%, #ff9c6b 100%)",
  moderate:
    "radial-gradient(circle at 72% 14%, rgba(255,255,255,0.62), transparent 36%), linear-gradient(145deg, #4ec4d4 0%, #16a6b6 48%, #08798a 100%)",
  deluxe:
    "radial-gradient(circle at 22% 78%, rgba(255,200,87,0.42), transparent 40%), linear-gradient(145deg, #071a26 0%, #102d3a 52%, #16a6b6 100%)",
  deluxe_villa:
    "radial-gradient(circle at 64% 24%, rgba(255,255,255,0.58), transparent 34%), linear-gradient(145deg, #ffc857 0%, #16a6b6 100%)",
  campground:
    "radial-gradient(circle at 38% 22%, rgba(255,255,255,0.55), transparent 32%), linear-gradient(145deg, #27724b 0%, #4ec4d4 55%, #fdb94e 100%)",
};

export function getResortTierGradient(category: string): string {
  return TIER_GRADIENTS[category] ?? TIER_GRADIENTS.moderate;
}

function buildResortPersonality({
  resort,
  tonightCount,
  todayCount,
}: {
  resort: ResortSummary;
  tonightCount?: number;
  todayCount?: number;
}): string[] {
  const signals: string[] = [];

  if ((tonightCount ?? 0) >= 3) {
    signals.push("Evening-rich");
  } else if ((todayCount ?? 0) >= 4) {
    signals.push("Daytime-friendly");
  }

  if (resort.offeringCount >= 10) {
    signals.push("Strong no-park-day option");
  } else if (resort.activityCount >= 6) {
    signals.push("Many current listings");
  }

  if (resort.category === "campground") {
    signals.push("Campfire-friendly");
  } else if (resort.category === "deluxe" || resort.category === "deluxe_villa") {
    signals.push("Good for a resort day");
  } else if (resort.category === "value") {
    signals.push("Good for quick plans");
  }

  return signals.slice(0, 3);
}

export function bestForLine(
  resort: ResortSummary,
  highlights: string[] = [],
  todayCount = 0,
  tonightCount = 0
): string {
  const highlightText = highlights.join(" ").toLowerCase();
  if (resort.category === "campground") {
    return "Best for: campfires, trail time, and a full outdoor resort day.";
  }
  if (highlightText.includes("campfire")) {
    return "Best for: campfires, outdoor evenings, and longer resort days.";
  }
  if (tonightCount >= 3 || highlightText.includes("movie")) {
    return "Best for: evening plans, movies, and low-effort after-park time.";
  }
  if (highlightText.includes("pool") || highlightText.includes("poolside")) {
    return "Best for: pool breaks, simple daytime activities, and staying close.";
  }
  if (todayCount >= 4) {
    return "Best for: flexible daytime plans and comparing several current options.";
  }
  if (resort.category === "deluxe" || resort.category === "deluxe_villa") {
    return "Best for: dining, easy resort hopping, and slower resort days.";
  }
  if (resort.category === "value") {
    return "Best for: quick plans, family activities, and easy evening options.";
  }
  return "Best for: pool time, simple activities, and flexible resort days.";
}

export type TravelWorthLabel =
  | "Best if staying here"
  | "Worth visiting if nearby"
  | "Worth a dedicated trip"
  | "Not worth crossing property for";

export interface TravelWorthResult {
  label: TravelWorthLabel;
  reason: string;
}

export function travelWorthForResort({
  resort,
  todayCount = 0,
  tonightCount = 0,
  highlights = [],
}: {
  resort: ResortSummary;
  todayCount?: number;
  tonightCount?: number;
  highlights?: string[];
}): TravelWorthResult {
  const categoryCount = new Set(highlights).size;
  let score = 0;

  if (resort.activityCount >= 8) score += 2;
  else if (resort.activityCount >= 4) score += 1;
  else if (resort.activityCount > 0) score += 1;
  if (resort.offeringCount >= 5) score += 1;
  if (todayCount >= 4) score += 2;
  else if (todayCount >= 2) score += 1;
  if (tonightCount >= 3) score += 2;
  else if (tonightCount >= 1) score += 1;
  if (categoryCount >= 3) score += 2;
  else if (categoryCount >= 2) score += 1;
  if (resort.category === "campground" || resort.category === "deluxe") score += 1;
  if (resort.category === "value" && score > 5) score = 5;

  if (score >= 8) {
    return {
      label: "Worth a dedicated trip",
      reason: "Many current options, evening depth, and enough variety to anchor a resort day.",
    };
  }
  if (score >= 5) {
    return {
      label: "Worth visiting if nearby",
      reason: "A useful cluster of activities, best when the route is simple.",
    };
  }
  if (score >= 1) {
    return {
      label: "Best if staying here",
      reason: "A lighter set of simple options works best when you are already at the resort.",
    };
  }
  return {
    label: "Not worth crossing property for",
    reason: "Limited current activity depth, so use it as a stay-put option.",
  };
}

interface ResortCardProps {
  resort: ResortSummary;
  tonightCount?: number;
  todayCount?: number;
  highlights?: string[];
}

export function ResortCard({
  resort,
  tonightCount,
  todayCount,
  highlights = [],
}: ResortCardProps) {
  const tierLabel = formatResortTier(resort.category);
  const isDarkBanner = resort.category === "deluxe";
  const initial = getResortInitial(resort.name);
  const hasStoryIcon = hasResortStoryIcon(resort.slug);
  const areaLabel = formatResortArea(resort.area);
  const tagline = getResortTagline(resort.category);
  const hasLiveCounts =
    (todayCount != null && todayCount > 0) ||
    (tonightCount != null && tonightCount > 0);
  const personality = buildResortPersonality({ resort, tonightCount, todayCount });
  const travelWorth = travelWorthForResort({
    resort,
    todayCount,
    tonightCount,
    highlights,
  });

  return (
    <article
      className={cn(
        "resort-card",
        "resort-card--clickable",
        `resort-card--${resort.category}`
      )}
    >
      <Link
        href={`/resorts/${resort.slug}`}
        className="resort-card__hit-area"
        aria-label={`View ${resort.name} resort guide`}
      >
        <div
          className="resort-card__banner"
          style={{ background: getResortTierGradient(resort.category) }}
        >
          <span
            className="hidden-resort-magic hrm-resort-tilework"
            data-hidden-detail="resort_card_tilework"
            aria-hidden
          />
          {hasStoryIcon ? (
            <ResortStoryIcon slug={resort.slug} isDarkBanner={isDarkBanner} />
          ) : (
            <span
              className={cn(
                "resort-card__initial",
                isDarkBanner && "resort-card__initial--light"
              )}
              aria-hidden
            >
              {initial}
            </span>
          )}
          <span
            className={cn(
              "resort-card__tier",
              isDarkBanner ? "resort-card__tier--dark" : "resort-card__tier--light"
            )}
          >
            {tierLabel}
          </span>
        </div>

        <div className="resort-card__body">
          {hasStoryIcon && (
            <span className="resort-card__story-watermark" aria-hidden>
              <ResortStoryIcon slug={resort.slug} isDarkBanner={isDarkBanner} />
            </span>
          )}
          <div className="resort-card__topline">
            <span className="resort-card__area">{areaLabel}</span>
          </div>

          <h3 className="resort-card__title">{resort.name}</h3>
          <p className="resort-card__tagline">{tagline}</p>
          <p className="resort-card__hint">
            {bestForLine(resort, highlights, todayCount, tonightCount)}
          </p>
          <p className="resort-card__hint">
            <strong>{travelWorth.label}:</strong> {travelWorth.reason}
          </p>

          {personality.length > 0 && (
            <div className="resort-card__personality" aria-label="Resort personality">
              {personality.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          )}

          <div className="resort-card__stats">
            <span className="resort-card__stat">
              {resort.activityCount}{" "}
              scheduled {resort.activityCount === 1 ? "activity" : "activities"}
            </span>
            {resort.offeringCount > 0 && (
              <span className="resort-card__stat">
                {resort.offeringCount} official{" "}
                {resort.offeringCount === 1 ? "offering" : "offerings"}
              </span>
            )}
            {todayCount != null && todayCount > 0 && (
              <span className="resort-card__stat resort-card__stat--today">
                {todayCount} today
              </span>
            )}
            {tonightCount != null && tonightCount > 0 && (
              <span className="resort-card__stat resort-card__stat--tonight">
                {tonightCount} tonight
              </span>
            )}
          </div>

          {highlights.length > 0 ? (
            <div className="resort-card__highlights">
              {highlights.map((label) => (
                <span key={label} className="resort-card__chip">
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="resort-card__hint">
              {hasLiveCounts
                ? "Schedules and offerings from current sources"
                : "Browse resort fun and official sources"}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
