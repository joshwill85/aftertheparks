"use client";

import Link from "next/link";
import { formatOrlandoDate, formatOrlandoTime } from "@/lib/daypart";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import { isUncertainSchedule } from "@/lib/text/normalize";
import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { FreshnessMeta } from "@/components/activity/FreshnessMeta";
import { SaveButton } from "@/components/activity/SaveButton";
import { usePlan } from "@/components/atlas/PlanProvider";
import {
  MagicNearbyBadge,
  MagicNearbyCollections,
} from "@/components/magic/MagicNearby";
import { EventDetailHero } from "@/components/events/EventDetailHero";
import {
  EventDetailFact,
  EventDetailSection,
} from "@/components/events/EventDetailSection";
import { TRUST_STATE_LABELS } from "@/lib/activityDisplay";
import { getCategoryMeta } from "@/lib/categories/meta";

function dedupeUpcoming(upcoming: ActivityOccurrence[]): ActivityOccurrence[] {
  const seen = new Set<string>();
  const result: ActivityOccurrence[] = [];
  for (const o of upcoming) {
    const key = `${o.startDateTime}-${o.endDateTime ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(o);
  }
  return result;
}

function formatDateOnly(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCentsRange(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined;
  const low = min ?? max;
  const high = max ?? min;
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value % 100 === 0 ? 0 : 2,
    }).format(value / 100);
  return low === high ? money(low!) : `${money(low!)}-${money(high!)}`;
}

function formatOccurrenceWhen(
  occurrence: ActivityOccurrence & { startDateTime: string }
): string {
  const start = formatOrlandoTime(occurrence.startDateTime);
  const end = occurrence.endDateTime
    ? ` – ${formatOrlandoTime(occurrence.endDateTime)}`
    : "";
  return `${formatOrlandoDate(occurrence.startDateTime)} · ${start}${end}`;
}

function hasStartDateTime(
  occurrence: ActivityOccurrence
): occurrence is ActivityOccurrence & { startDateTime: string } {
  return Boolean(occurrence.startDateTime);
}

export function ActivityDetailClient({
  activity,
  upcoming,
  similar = [],
  nearbyActivities = [],
  homeResort,
}: {
  activity: ActivityOccurrence;
  upcoming: ActivityOccurrence[];
  similar?: ActivityOccurrence[];
  nearbyActivities?: ActivityOccurrence[];
  homeResort?: { slug: string; area: string };
}) {
  const { addActivity, isInPlan } = usePlan();
  const inPlan = isInPlan(activity.activityCatalogId);
  const display = toDisplayActivity(activity);
  const meta = getCategoryMeta(activity.category);
  const hero = activityToEventCard(activity, display, {
    showResort: true,
    variant: "day",
    includeScheduleDate: true,
  });
  const scheduleRows = dedupeUpcoming(upcoming);
  const timedScheduleRows = scheduleRows.filter(hasStartDateTime);
  const uncertainTime =
    display.timeUncertain ||
    isUncertainSchedule(activity.scheduleText);
  const hasBackedTime = Boolean(
    timedScheduleRows[0] || activity.startDateTime || display.timeLabel
  );
  const showUncertainTime = uncertainTime && hasBackedTime;

  const whenLabel = timedScheduleRows[0]
    ? showUncertainTime
      ? "Confirm with resort"
      : formatOccurrenceWhen(timedScheduleRows[0])
    : showUncertainTime
      ? "Confirm with resort"
      : display.timeLabel;

  const whenDateTime = timedScheduleRows[0]?.startDateTime ?? activity.startDateTime;
  const hasTimeField = Boolean(whenLabel);
  const hasScheduleSection =
    showUncertainTime ||
    timedScheduleRows.length > 0 ||
    Boolean(display.timeLabel);

  const goodToKnow: string[] = [];
  const addGoodToKnow = (note?: string | null) => {
    if (note && !goodToKnow.includes(note)) goodToKnow.push(note);
  };
  if (display.trustState === "confirm_before_going") {
    addGoodToKnow("Confirm the latest schedule with the resort before heading out.");
  }
  if (display.trustState === "time_unclear") {
    addGoodToKnow("Published times may be incomplete — check the recreation guide.");
  }
  if (display.costLabel === "Price unclear") {
    addGoodToKnow("Pricing wasn't clear in the source calendar — ask at the front desk.");
  }
  if (activity.price.notes) {
    addGoodToKnow(activity.price.notes);
  }
  for (const option of activity.price.options ?? []) {
    const price = formatCentsRange(option.priceCentsMin, option.priceCentsMax);
    if (price) {
      addGoodToKnow(
        option.optionName ? `${option.optionName}: ${price}` : `Price option: ${price}`
      );
    }
  }
  if (activity.enrichment?.ageMinimum) {
    addGoodToKnow(`Ages ${activity.enrichment.ageMinimum} and up.`);
  }
  if (activity.enrichment?.reservationRequired) {
    const phone = activity.enrichment.reservationPhone
      ? ` at ${activity.enrichment.reservationPhone}`
      : "";
    addGoodToKnow(`Reservations required${phone}.`);
  } else if (activity.enrichment?.reservationRecommended) {
    addGoodToKnow("Reservations recommended.");
  }
  if (activity.enrichment?.walkUpsAllowed) {
    addGoodToKnow("Walk-ups may be available.");
  }
  if (activity.startDateTime && activity.enrichment?.checkInOffsetMinutes) {
    addGoodToKnow(
      `Arrive ${activity.enrichment.checkInOffsetMinutes} minutes before the start time.`
    );
  }
  if (activity.enrichment?.resortGuestOnly) {
    addGoodToKnow("Limited to guests staying at the resort.");
  }
  if (activity.enrichment?.sisterResortAccess) {
    addGoodToKnow("Sister-resort guest access may apply.");
  }
  if (activity.enrichment?.poolGated) {
    addGoodToKnow("Held inside or near a gated pool area.");
  }
  const validFrom = formatDateOnly(activity.validFrom);
  const validUntil = formatDateOnly(activity.validUntil);
  const nextSchedule = formatDateOnly(activity.enrichment?.nextScheduleExpectedDate);
  if (validFrom && validUntil) {
    addGoodToKnow(`Current schedule window: ${validFrom} through ${validUntil}.`);
  }
  if (nextSchedule) {
    addGoodToKnow(`Next schedule update expected ${nextSchedule}.`);
  }

  const exactVenue = activity.enrichment?.exactVenue;
  const showOfficialLocation =
    exactVenue &&
    exactVenue.trim().toLowerCase() !== display.locationLabel.trim().toLowerCase();

  return (
    <div className="space-y-8">
      <EventDetailHero {...hero} summary={undefined} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="event-detail-facts">
            {hasTimeField && (
              <EventDetailFact label="When">
                {whenDateTime ? (
                  <time dateTime={whenDateTime} className="font-display font-semibold">
                    {whenLabel}
                  </time>
                ) : (
                  <p className="font-display font-semibold">{whenLabel}</p>
                )}
              </EventDetailFact>
            )}
            <EventDetailFact label="Cost">
              <p className="font-display font-semibold">{display.costLabel}</p>
            </EventDetailFact>
            <EventDetailFact label="Best for">
              <p className="font-display font-semibold">
                {display.categoryLabel} ·{" "}
                {activity.eligibility.ages.join(", ").replace(/_/g, " ")}
              </p>
            </EventDetailFact>
          </section>

          {display.summary && (
            <EventDetailSection title="What to expect" tone="warm">
              <p className="event-detail-prose">{display.summary}</p>
            </EventDetailSection>
          )}

          <EventDetailSection title="Where to go" tone="lagoon">
            <p className="font-display text-lg font-semibold">
              {exactVenue ?? display.locationLabel}
            </p>
            {showOfficialLocation && (
              <p className="event-detail-prose mt-1">{display.locationLabel}</p>
            )}
            <p className="event-detail-prose mt-1">{display.resortName}</p>
          </EventDetailSection>

          {goodToKnow.length > 0 && (
            <EventDetailSection title="Good to know">
              <ul className="event-detail-list">
                {goodToKnow.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </EventDetailSection>
          )}

          {hasScheduleSection && (
            <EventDetailSection title="Schedule">
              {showUncertainTime && (
                <p className="event-detail-note">
                  Times may need official confirmation — check the resort recreation guide
                  before heading out.
                </p>
              )}
              <ul className="event-detail-schedule">
                {showUncertainTime ? (
                  <li className="event-detail-prose">
                    {activity.scheduleText?.trim() ||
                      "See the official resort recreation guide for the latest schedule."}
                  </li>
                ) : timedScheduleRows.length > 0 ? (
                  timedScheduleRows.map((o) => (
                    <li key={o.id} className="event-detail-schedule__row">
                      <time dateTime={o.startDateTime}>
                        {formatOrlandoDate(o.startDateTime)}
                      </time>
                      <span className="font-semibold">
                        <time dateTime={o.startDateTime}>
                          {formatOrlandoTime(o.startDateTime)}
                        </time>
                        {o.endDateTime && (
                          <>
                            {" – "}
                            <time dateTime={o.endDateTime}>
                              {formatOrlandoTime(o.endDateTime)}
                            </time>
                          </>
                        )}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="event-detail-prose">
                    {display.timeLabel}
                  </li>
                )}
              </ul>
            </EventDetailSection>
          )}

          {similar.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold">More like this</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Other {display.categoryLabel.toLowerCase()} moments at {display.resortName}.
              </p>
              <div className="mt-4">
                <ActivityGrid activities={similar} showResort={false} columns={2} />
              </div>
            </section>
          )}

          {nearbyActivities.length > 0 && (
            <MagicNearbyCollections
              activities={nearbyActivities}
              homeResort={homeResort}
            />
          )}
        </div>

        <aside className="space-y-4">
          <MagicNearbyBadge activity={activity} homeResort={homeResort} />

          <EventDetailSection title="Plan this one">
            <span className="event-detail-trust">
              <span aria-hidden>{meta.icon}</span>
              {TRUST_STATE_LABELS[display.trustState]}
            </span>
            <p className="mt-3 text-sm font-bold text-[var(--color-muted)]">
              {display.categoryLabel}
            </p>
            <FreshnessMeta freshness={activity.freshness} className="mt-4" />
            <SaveButton
              saved={inPlan}
              onSave={() => addActivity(activity)}
              className="mt-4 w-full justify-center"
            />
            <Link
              href={`/resorts/${activity.resort.slug}`}
              className="event-detail-aside-link"
            >
              More at {activity.resort.name}
            </Link>
            {activity.freshness.sourceUrl && (
              <a
                href={activity.freshness.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-detail-aside-link event-detail-aside-link--primary"
              >
                View source calendar
              </a>
            )}
          </EventDetailSection>
        </aside>
      </div>
    </div>
  );
}
