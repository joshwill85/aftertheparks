import Image from "next/image";
import { CategoryIcon } from "@/components/activity/CategoryIcon";
import {
  shouldRenderTrustBadge,
  TrustBadge,
} from "@/components/activity/TrustBadge";
import {
  hasResortStoryIcon,
  ResortStoryIcon,
} from "@/components/resort/ResortStoryIcon";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";
import type { EventBadge, EventBadgeTone, EventMedia } from "@/components/events/EventCard";

export function eventBadgeClass(
  tone: EventBadgeTone | undefined,
  isNight: boolean
): string {
  switch (tone) {
    case "tonight":
      return isNight
        ? "event-card__badge event-card__badge--tonight-night"
        : "event-card__badge event-card__badge--tonight-day";
    case "now":
      return isNight
        ? "event-card__badge event-card__badge--now-night"
        : "event-card__badge event-card__badge--now-day";
    case "warning":
      return "event-card__badge event-card__badge--warning";
    case "free":
      return "event-card__badge event-card__badge--free";
    case "paid":
      return "event-card__badge event-card__badge--paid";
    default:
      return "event-card__badge event-card__badge--muted";
  }
}

export function EventBadgeRow({
  badges,
  isNight,
  showTrust,
  trustActivity,
}: {
  badges: EventBadge[];
  isNight: boolean;
  showTrust?: boolean;
  trustActivity?: ActivityOccurrence;
}) {
  const renderTrust = Boolean(
    showTrust && trustActivity && shouldRenderTrustBadge(trustActivity)
  );

  if (badges.length === 0 && !renderTrust) return null;

  return (
    <div className="event-card__badges">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.tone ?? "muted"}`}
          className={eventBadgeClass(badge.tone, isNight)}
        >
          {badge.label}
        </span>
      ))}
      {renderTrust && trustActivity && (
        <TrustBadge activity={trustActivity} />
      )}
    </div>
  );
}

export function EventMediaDisplay({
  media,
  size = "card",
  resortSlug,
}: {
  media: EventMedia;
  size?: "card" | "detail";
  resortSlug?: string;
}) {
  const isDetail = size === "detail";
  const showResortIcon = Boolean(
    resortSlug && hasResortStoryIcon(resortSlug)
  );

  const withResortIdentity = (children: React.ReactNode) => (
    <div
      className={cn(
        "event-card__media-shell",
        isDetail && "event-card__media-shell--detail"
      )}
    >
      {children}
      {showResortIcon && resortSlug && (
        <span className="event-card__resort-story-icon" aria-hidden>
          <ResortStoryIcon slug={resortSlug} />
        </span>
      )}
    </div>
  );

  if (media.kind === "poster") {
    const w = isDetail ? 120 : 80;
    const h = isDetail ? 180 : 120;
    return withResortIdentity(
      <div
        className={cn(
          "event-card__media event-card__media--poster",
          isDetail && "event-card__media--poster-lg"
        )}
      >
        <Image
          src={media.src}
          alt=""
          width={w}
          height={h}
          className={cn(
            "event-card__poster-img",
            isDetail && "event-card__poster-img--lg"
          )}
          sizes={isDetail ? "120px" : "80px"}
        />
      </div>
    );
  }

  if (media.kind === "movie") {
    const w = isDetail ? 120 : 86;
    const h = isDetail ? 180 : 130;
    return withResortIdentity(
      <div
        className={cn(
          "event-card__media event-card__media--movie",
          isDetail && "event-card__media--movie-lg"
        )}
      >
        {media.backdropSrc && (
          <Image
            src={media.backdropSrc}
            alt=""
            fill
            className="event-card__movie-backdrop"
            sizes={isDetail ? "120px" : "86px"}
          />
        )}
        <span className="event-card__movie-shine" aria-hidden />
        <Image
          src={media.posterSrc}
          alt=""
          width={w}
          height={h}
          className={cn(
            "event-card__movie-poster",
            isDetail && "event-card__movie-poster--lg"
          )}
          sizes={isDetail ? "120px" : "86px"}
        />
      </div>
    );
  }

  if (media.kind === "initial") {
    return withResortIdentity(
      <div
        className={cn(
          "event-card__media event-card__media--initial",
          isDetail && "event-card__media--initial-lg",
          media.category && `category-${media.category}`
        )}
      >
        <span
          className={cn(
            "event-card__initial",
            isDetail && "event-card__initial--lg"
          )}
        >
          {media.letter}
        </span>
      </div>
    );
  }

  return withResortIdentity(
    <div
      className={cn(
        "event-card__media event-card__media--category",
        isDetail && "event-card__media--category-lg",
        `category-${media.category}`
      )}
    >
      <CategoryIcon
        category={media.category}
        size={isDetail ? "md" : "md"}
        showStamp={isDetail}
      />
    </div>
  );
}

export function EventTitleBlock({
  title,
  resort,
  location,
  extra,
  timeLabel,
  timeDateTime,
  timeUncertain,
  scheduleDayLabel,
  scheduleDayDateTime,
  summary,
  footnote,
  headingLevel = "h3",
  headingId,
}: {
  title: string;
  resort?: string;
  location?: string;
  extra?: string;
  timeLabel?: string;
  timeDateTime?: string;
  timeUncertain?: boolean;
  scheduleDayLabel?: string;
  scheduleDayDateTime?: string;
  summary?: string;
  footnote?: string;
  headingLevel?: "h1" | "h3";
  headingId?: string;
}) {
  const Heading = headingLevel;

  return (
    <>
      <Heading
        id={headingId}
        className={cn(
          "event-card__title",
          headingLevel === "h1" && "event-card__title--detail"
        )}
      >
        {title}
      </Heading>
      {extra && <p className="event-card__extra">{extra}</p>}
      {resort && (
        <p className="event-card__resort">
          <span className="sr-only">Resort:</span>
          {resort}
        </p>
      )}
      {location && (
        <p className="event-card__location">
          <span className="sr-only">Where:</span>
          {location}
        </p>
      )}
      {scheduleDayLabel && (
        <p className="event-card__day">
          <span className="sr-only">Day:</span>
          {scheduleDayDateTime ? (
            <time dateTime={scheduleDayDateTime}>{scheduleDayLabel}</time>
          ) : (
            scheduleDayLabel
          )}
        </p>
      )}
      {timeLabel && (
        <p
          className={cn(
            "event-card__time",
            timeUncertain && "event-card__time--uncertain"
          )}
        >
          <span className="sr-only">When:</span>
          {timeDateTime ? (
            <time dateTime={timeDateTime}>{timeLabel}</time>
          ) : (
            timeLabel
          )}
        </p>
      )}
      {summary && (
        <p
          className={cn(
            "event-card__summary",
            headingLevel === "h1" && "event-card__summary--detail"
          )}
        >
          {summary}
        </p>
      )}
      {footnote && <p className="event-card__footnote">{footnote}</p>}
    </>
  );
}
