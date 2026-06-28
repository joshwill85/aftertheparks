"use client";

import { useState } from "react";
import Link from "next/link";
import { DecisionSignals } from "@/components/activity/DecisionSignals";
import { SaveButton } from "@/components/activity/SaveButton";
import { EventWeatherSignal } from "@/components/weather/EventWeatherSignal";
import { WeatherIconButton } from "@/components/weather/WeatherIconButton";
import { WeatherTimeSpanPopover } from "@/components/weather/WeatherTimeSpanPopover";
import {
  hasResortStoryIcon,
  ResortStoryIcon,
} from "@/components/resort/ResortStoryIcon";
import type { DecisionProfile } from "@/lib/activityDecision";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import type { WeatherForTimeSpan } from "@/lib/weather/types";
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
  | { kind: "movie"; posterSrc: string; backdropSrc?: string | null; alt?: string }
  | { kind: "initial"; letter: string; category?: string };

export interface EventWeatherQuery {
  resortSlug?: string;
  locationKey?: string;
  startsAt?: string;
  endsAt?: string;
  activitySlug?: string;
}

export type WeatherDecisionLabel =
  | "Good to go"
  | "Go earlier"
  | "Bring backup"
  | "Likely affected"
  | "Stay indoors"
  | "Official alert";

export interface EventCardProps {
  variant?: "day" | "night";
  href?: string;
  title: string;
  resort: string;
  resortSlug?: string;
  location?: string;
  extra?: string;
  timeLabel?: string;
  timeDateTime?: string;
  endDateTime?: string;
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
  decisionProfile?: DecisionProfile;
  onOpen?: () => void;
  openLabel?: string;
  showWeatherSignal?: boolean;
  weatherSummary?: WeatherForTimeSpan | null;
  weatherQuery?: EventWeatherQuery;
  weatherDecisionLabel?: WeatherDecisionLabel;
  className?: string;
}

function hasDisplayableWeatherIcon(
  weather: WeatherForTimeSpan | null | undefined
): weather is WeatherForTimeSpan {
  return Boolean(
    weather?.shouldDisplayWeather &&
      weather.forecastStatus !== "not_available_yet" &&
      weather.iconKey !== "unknown"
  );
}

export function EventCard({
  variant = "day",
  href,
  title,
  resort,
  resortSlug,
  location,
  extra,
  timeLabel,
  timeDateTime,
  endDateTime,
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
  decisionProfile,
  onOpen,
  openLabel,
  showWeatherSignal = true,
  weatherSummary,
  weatherQuery,
  weatherDecisionLabel,
  className,
}: EventCardProps) {
  const [weatherOpen, setWeatherOpen] = useState(false);
  const isNight = variant === "night";
  const saveVariant = isNight ? "night" : "day";
  const isClickable = Boolean(href || onOpen);
  const shouldShowWeatherSummary = hasDisplayableWeatherIcon(weatherSummary);
  const showStoryWatermark = Boolean(resortSlug && hasResortStoryIcon(resortSlug));

  const body = (
    <>
      <EventMediaDisplay media={media} size="card" resortSlug={resortSlug} />
      <div className="event-card__body">
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
        {decisionProfile && (
          <DecisionSignals profile={decisionProfile} compact maxSignals={4} />
        )}
        {!shouldShowWeatherSummary && showWeatherSignal && (weatherQuery?.startsAt ?? timeDateTime) ? (
          <EventWeatherSignal
            resortSlug={weatherQuery?.resortSlug ?? resortSlug}
            locationKey={weatherQuery?.locationKey}
            startsAt={weatherQuery?.startsAt ?? timeDateTime}
            endsAt={weatherQuery?.endsAt ?? endDateTime}
            className="event-card__inline-weather"
          />
        ) : null}
        <div className="event-card__footer">
          <EventBadgeRow
            badges={badges}
            isNight={isNight}
            showTrust={showTrust}
            trustActivity={trustActivity}
          />
        </div>
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
        shouldShowWeatherSummary && "event-card--has-weather",
        className
      )}
    >
      {showStoryWatermark && resortSlug && (
        <span className="event-card__story-watermark" aria-hidden>
          <ResortStoryIcon slug={resortSlug} />
        </span>
      )}

      {onOpen ? (
        <button
          type="button"
          className="event-card__hit-area"
          aria-label={openLabel ?? `View ${title}`}
          onClick={onOpen}
        >
          {body}
        </button>
      ) : href ? (
        <Link href={href!} className="event-card__hit-area" aria-label={`View ${title}`}>
          {body}
        </Link>
      ) : (
        <div className="event-card__hit-area">{body}</div>
      )}

      {shouldShowWeatherSummary && weatherSummary && (
        <div
          className="event-card__weather"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <WeatherIconButton
            weather={weatherSummary}
            decisionLabel={weatherDecisionLabel}
            onClick={() => setWeatherOpen(true)}
          />
          <WeatherTimeSpanPopover
            weather={weatherSummary}
            open={weatherOpen}
            onClose={() => setWeatherOpen(false)}
          />
        </div>
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
