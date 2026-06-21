"use client";

import { cn } from "@/lib/utils";
import type { EventCardProps } from "@/components/events/EventCard";
import {
  EventBadgeRow,
  EventMediaDisplay,
  EventTitleBlock,
} from "@/components/events/event-ui";

type EventDetailHeroProps = Pick<
  EventCardProps,
  | "variant"
  | "title"
  | "resort"
  | "location"
  | "extra"
  | "timeLabel"
  | "timeDateTime"
  | "timeUncertain"
  | "scheduleDayLabel"
  | "scheduleDayDateTime"
  | "summary"
  | "footnote"
  | "badges"
  | "media"
  | "isHappeningNow"
  | "showTrust"
  | "trustActivity"
  | "className"
>;

export function EventDetailHero({
  variant = "day",
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
  badges = [],
  media,
  isHappeningNow,
  showTrust,
  trustActivity,
  className,
}: EventDetailHeroProps) {
  const isNight = variant === "night";

  return (
    <header
      className={cn(
        "event-detail-hero",
        isNight ? "event-detail-hero--night" : "event-detail-hero--day",
        isHappeningNow && "event-detail-hero--now",
        media.kind === "category" && `event-detail-hero--${media.category}`,
        className
      )}
    >
      <div className="event-detail-hero__shine" aria-hidden />
      <div className="event-detail-hero__layout">
        <EventMediaDisplay media={media} size="detail" />
        <div className="event-detail-hero__body">
          <EventBadgeRow
            badges={badges}
            isNight={isNight}
            showTrust={showTrust}
            trustActivity={trustActivity}
          />
          <EventTitleBlock
            title={title}
            resort={resort}
            location={location}
            extra={extra}
            timeLabel={timeLabel}
            timeDateTime={timeDateTime}
            timeUncertain={timeUncertain}
            scheduleDayLabel={scheduleDayLabel}
            scheduleDayDateTime={scheduleDayDateTime}
            summary={summary}
            footnote={footnote}
            headingLevel="h1"
          />
        </div>
      </div>
    </header>
  );
}
