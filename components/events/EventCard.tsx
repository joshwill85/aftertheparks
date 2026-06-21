"use client";

import Link from "next/link";
import { SaveButton } from "@/components/activity/SaveButton";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";
import {
  EventBadgeRow,
  EventMediaDisplay,
  EventTitleBlock,
} from "@/components/events/event-ui";

export type EventBadgeTone =
  | "default"
  | "tonight"
  | "now"
  | "warning"
  | "muted"
  | "free"
  | "paid";

export interface EventBadge {
  label: string;
  tone?: EventBadgeTone;
}

export type EventMedia =
  | { kind: "category"; category: string }
  | { kind: "poster"; src: string; alt?: string }
  | { kind: "initial"; letter: string; category?: string };

export interface EventCardProps {
  variant?: "day" | "night";
  href?: string;
  title: string;
  resort: string;
  location?: string;
  extra?: string;
  timeLabel?: string;
  timeDateTime?: string;
  timeUncertain?: boolean;
  scheduleDayLabel?: string;
  scheduleDayDateTime?: string;
  summary?: string;
  footnote?: string;
  badges?: EventBadge[];
  media: EventMedia;
  isHappeningNow?: boolean;
  onSave?: () => void;
  saved?: boolean;
  showTrust?: boolean;
  trustActivity?: ActivityOccurrence;
  className?: string;
}

export function EventCard({
  variant = "day",
  href,
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
  onSave,
  saved,
  showTrust,
  trustActivity,
  className,
}: EventCardProps) {
  const isNight = variant === "night";
  const saveVariant = isNight ? "night" : "day";
  const isClickable = Boolean(href);

  const body = (
    <>
      <EventMediaDisplay media={media} size="card" />
      <div className="event-card__body">
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
        />
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "event-card",
        isNight ? "event-card--night" : "event-card--day",
        isHappeningNow && "event-card--now",
        isClickable && "event-card--clickable",
        onSave && "event-card--has-save",
        className
      )}
    >
      {isClickable ? (
        <Link href={href!} className="event-card__hit-area" aria-label={`View ${title}`}>
          {body}
        </Link>
      ) : (
        <div className="event-card__hit-area">{body}</div>
      )}

      {onSave && (
        <div
          className="event-card__save"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SaveButton
            saved={Boolean(saved)}
            variant={saveVariant}
            onSave={onSave}
          />
        </div>
      )}
    </article>
  );
}
