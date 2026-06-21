import Image from "next/image";
import { CategoryIcon } from "@/components/activity/CategoryIcon";
import { TrustBadge } from "@/components/activity/TrustBadge";
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
  if (badges.length === 0 && !showTrust) return null;

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
      {showTrust && trustActivity && (
        <TrustBadge activity={trustActivity} />
      )}
    </div>
  );
}

export function EventMediaDisplay({
  media,
  size = "card",
}: {
  media: EventMedia;
  size?: "card" | "detail";
}) {
  const isDetail = size === "detail";

  if (media.kind === "poster") {
    const w = isDetail ? 120 : 80;
    const h = isDetail ? 180 : 120;
    return (
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

  if (media.kind === "initial") {
    return (
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

  return (
    <div
      className={cn(
        "event-card__media event-card__media--category",
        isDetail && "event-card__media--category-lg",
        `category-${media.category}`
      )}
    >
      <CategoryIcon
        category={media.category}
        size={isDetail ? "md" : "sm"}
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
}) {
  const Heading = headingLevel;

  return (
    <>
      <Heading
        className={cn(
          "event-card__title",
          headingLevel === "h1" && "event-card__title--detail"
        )}
      >
        {title}
      </Heading>
      {extra && <p className="event-card__extra">{extra}</p>}
      {resort && <p className="event-card__resort">{resort}</p>}
      {location && <p className="event-card__location">{location}</p>}
      {scheduleDayLabel && (
        <p className="event-card__day">
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
