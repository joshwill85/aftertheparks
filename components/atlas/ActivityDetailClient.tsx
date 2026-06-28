"use client";

import Link from "next/link";
import { formatOrlandoDate, formatOrlandoTime } from "@/lib/daypart";
import { toDisplayActivity } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import { isUncertainSchedule } from "@/lib/text/normalize";
import type { ActivityOccurrence, ActivityPriceOption } from "@/lib/types/occurrence";
import { ActivityGrid } from "@/components/atlas/ActivityGrid";
import { DecisionSignals } from "@/components/activity/DecisionSignals";
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
import { SeoFaq } from "@/components/seo/SeoFaq";
import { activityDecisionProfile } from "@/lib/activityDecision";
import type { SeoFaqItem } from "@/lib/seo/faqs";

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
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
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

function formatOptionalPrice(option: ActivityPriceOption): string | undefined {
  const amount = formatCentsRange(option.priceCentsMin, option.priceCentsMax);
  if (!amount) return option.notes;
  if (
    option.priceConfidence === "secondary_verified" ||
    option.verificationStatus === "needs_disney_confirmation"
  ) {
    return `Usually around ${amount} plus tax`;
  }
  return amount;
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

function orlandoDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function uniqueResortNames(activities: ActivityOccurrence[]): string[] {
  return Array.from(new Set(activities.map((item) => item.resort.name))).filter(Boolean);
}

function topResortsByActivity(activities: ActivityOccurrence[], limit = 4): Array<{
  slug: string;
  name: string;
  count: number;
}> {
  const byResort = new Map<string, { slug: string; name: string; count: number }>();
  for (const item of activities) {
    const current = byResort.get(item.resort.slug) ?? {
      slug: item.resort.slug,
      name: item.resort.name,
      count: 0,
    };
    current.count += 1;
    byResort.set(item.resort.slug, current);
  }
  return [...byResort.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function reservationCopy(activity: ActivityOccurrence): string {
  if (activity.enrichment?.reservationRequired || activity.eligibility.reservation?.required) {
    return "Reservation required; confirm booking method, arrival window, cancellation rules, and eligibility.";
  }
  if (activity.enrichment?.reservationRecommended) {
    return "Reservation recommended; walk-up availability may change by date, resort, and capacity.";
  }
  return "No reservation requirement is currently tracked, but access and eligibility can still change.";
}

function ActivityPlanningSnapshot({
  activity,
  upcoming,
  display,
  whenLabel,
}: {
  activity: ActivityOccurrence;
  upcoming: ActivityOccurrence[];
  display: ReturnType<typeof toDisplayActivity>;
  whenLabel?: string;
}) {
  const allRows = [activity, ...upcoming];
  const participatingResorts = uniqueResortNames(allRows);
  const todayKey = orlandoDateKey();
  const todayRows = upcoming.filter((item) => item.startDateTime?.startsWith(todayKey));
  const tonightRows = upcoming.filter(
    (item) =>
      item.startDateTime?.startsWith(todayKey) &&
      (item.daypart === "evening" ||
        item.daypart === "late" ||
        item.category === "movies_under_stars" ||
        item.category === "campfire" ||
        item.category === "nighttime_entertainment")
  );
  const bestResorts = topResortsByActivity(allRows);
  const currentResortCount = participatingResorts.length;
  const nextKnown =
    upcoming.find((item) => item.startDateTime)?.startDateTime ?? activity.startDateTime;
  const nextKnownLabel = nextKnown
    ? `${formatOrlandoDate(nextKnown)} at ${formatOrlandoTime(nextKnown)}`
    : whenLabel || "Use today and tonight views for current source-backed timing.";
  const confirmItems = [
    "Current time and exact location",
    "Day-of cancellations and operating changes",
    "Cost, supplies, eligibility, and resort access",
    reservationCopy(activity),
  ];

  return (
    <section className="event-detail-section">
      <h2 className="event-detail-section__title">Activity planning snapshot</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {activity.title} is a {display.categoryLabel.toLowerCase()} activity
            currently tracked at {activity.resort.name}. It is listed as{" "}
            {display.costLabel?.toLowerCase() ?? "cost to confirm"}, with the next
            known timing shown as {nextKnownLabel}.
          </p>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Participating resorts</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {currentResortCount > 1
              ? `After the Parks currently tracks this activity family across ${currentResortCount} resorts, including ${participatingResorts.slice(0, 4).join(", ")}.`
              : `After the Parks currently has this activity tied to ${activity.resort.name}. Check the broader activity directory for related resort listings.`}
          </p>
          <Link href={`/activities?category=${activity.category}`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Browse this activity type
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Today and tonight</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Today has {todayRows.length} tracked {todayRows.length === 1 ? "listing" : "listings"} for
            this activity family, with {tonightRows.length} evening or tonight{" "}
            {tonightRows.length === 1 ? "option" : "options"}. Times can change,
            so confirm before walking over.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
            <Link href={`/today?category=${activity.category}`} className="text-[var(--accent)] hover:underline">
              See today
            </Link>
            <Link href={`/tonight?category=${activity.category}`} className="text-[var(--accent)] hover:underline">
              See tonight
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Cost and reservations</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Cost: {display.costLabel ?? "confirm with the source"}. {reservationCopy(activity)}
          </p>
          <Link href="/activities?reservation=true" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Find reservation-sensitive activities
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Best resorts for this activity</h3>
          {bestResorts.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {bestResorts.map((resort) => (
                <li key={resort.slug}>
                  <Link href={`/resorts/${resort.slug}`} className="font-bold text-[var(--accent)] hover:underline">
                    {resort.name}
                  </Link>{" "}
                  ({resort.count} tracked {resort.count === 1 ? "listing" : "listings"})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Use the activity directory to compare current resort listings.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Tips</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Start with the current listing at {activity.resort.name}, compare the
            easiest nearby alternatives, and keep the plan flexible if timing,
            travel time, or eligibility matters.
          </p>
          <Link href={`/activities?category=${activity.category}`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Compare this category
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Cancellation caveats</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Operations can affect movies, campfires, pools, boats, sports, and
            longer walks. Confirm the final time, location, and cancellation
            status before leaving your resort area.
          </p>
          <Link href={`/activities?category=${activity.category}&backup=covered`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Find backup options
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Similar activities</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            If this exact listing does not fit, use the same-category activity
            view or nearby resort collections to find alternatives without
            turning the plan into a long transfer.
          </p>
          <Link href={`/activities?category=${activity.category}`} className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Browse similar activities
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Official-source notes</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            After the Parks organizes resort activity data for planning. Disney
            remains the official source for current times, access, pricing,
            eligibility, day-of decisions, and operational changes.
          </p>
          <Link href="/source-and-accuracy-policy" className="mt-3 inline-flex text-sm font-bold text-[var(--accent)] hover:underline">
            Source policy
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-display text-lg font-semibold">Confirm before going</h3>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {confirmItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export function ActivityDetailClient({
  activity,
  upcoming,
  similar = [],
  nearbyActivities = [],
  homeResort,
  faqItems,
}: {
  activity: ActivityOccurrence;
  upcoming: ActivityOccurrence[];
  similar?: ActivityOccurrence[];
  nearbyActivities?: ActivityOccurrence[];
  homeResort?: { slug: string; area: string };
  faqItems: SeoFaqItem[];
}) {
  const { addActivity, isActivitySaved } = usePlan();
  const inPlan = isActivitySaved(activity);
  const display = toDisplayActivity(activity);
  const decisionProfile = activityDecisionProfile(activity, display);
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
  const hasBackedTime = Boolean(timedScheduleRows[0] || activity.startDateTime);
  const showUncertainTime = uncertainTime && hasBackedTime;

  const whenLabel = timedScheduleRows[0]
    ? showUncertainTime
      ? "Confirm with resort"
      : formatOccurrenceWhen(timedScheduleRows[0])
    : display.whenLabel;

  const whenDateTime = timedScheduleRows[0]?.startDateTime ?? activity.startDateTime;
  const hasTimeField = Boolean(whenLabel);
  const hasScheduleSection =
    showUncertainTime ||
    timedScheduleRows.length > 0 ||
    Boolean(display.timeLabel);
  const optionalPriceOptions =
    activity.price.options?.filter((option) => option.priceBasis === "optional_add_on") ?? [];

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
  if (activity.price.notes) {
    addGoodToKnow(activity.price.notes);
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
    addGoodToKnow("Associated with a gated pool area.");
  }
  const validFrom = formatDateOnly(activity.validFrom);
  const validUntil = formatDateOnly(activity.validUntil);
  const lastVerified = formatDateOnly(activity.freshness.lastVerified);
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
            {display.costLabel && (
              <EventDetailFact label="Cost">
                <p className="font-display font-semibold">{display.costLabel}</p>
              </EventDetailFact>
            )}
            <EventDetailFact label="Best for">
              <p className="font-display font-semibold">
                {display.categoryLabel} ·{" "}
                {activity.eligibility.ages.join(", ").replace(/_/g, " ")}
              </p>
            </EventDetailFact>
          </section>

          <ActivityPlanningSnapshot
            activity={activity}
            upcoming={upcoming}
            display={display}
            whenLabel={whenLabel}
          />

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

          {optionalPriceOptions.length > 0 && (
            <EventDetailSection title="Optional purchases">
              <ul className="event-detail-list">
                {optionalPriceOptions.map((option) => {
                  const price = formatOptionalPrice(option);
                  const label = option.optionName ?? "Optional item";
                  return (
                    <li key={`${label}-${price ?? option.notes ?? ""}`}>
                      {price ? `${label}: ${price}` : label}
                    </li>
                  );
                })}
              </ul>
            </EventDetailSection>
          )}

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
                Other {display.categoryLabel.toLowerCase()} activities at {display.resortName}.
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

          <SeoFaq title="Common questions" items={faqItems} />
        </div>

        <aside className="space-y-4">
          <MagicNearbyBadge activity={activity} homeResort={homeResort} />

          <EventDetailSection title="Plan this one">
            <p className="mt-3 text-sm font-bold text-[var(--color-muted)]">
              {display.categoryLabel}
            </p>
            <DecisionSignals profile={decisionProfile} />
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
          </EventDetailSection>

          <EventDetailSection title="Source and freshness">
            <dl className="space-y-3 text-sm">
              {lastVerified && (
                <div>
                  <dt className="font-bold text-[var(--color-foreground)]">
                    Last verified
                  </dt>
                  <dd className="mt-1 text-[var(--color-muted)]">
                    {lastVerified}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-bold text-[var(--color-foreground)]">
                  Source status
                </dt>
                <dd className="mt-1 text-[var(--color-muted)]">
                  {activity.freshness.badge === "verified"
                    ? "Source-backed, but still confirm before heading out."
                    : "Needs current confirmation before you rely on it."}
                </dd>
              </div>
              {validFrom && validUntil && (
                <div>
                  <dt className="font-bold text-[var(--color-foreground)]">
                    Schedule window
                  </dt>
                  <dd className="mt-1 text-[var(--color-muted)]">
                    {validFrom} through {validUntil}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 space-y-2">
              {activity.freshness.sourceUrl && (
                <a
                  href={activity.freshness.sourceUrl}
                  className="block text-sm font-bold text-[var(--accent)] hover:underline"
                  rel="nofollow noopener noreferrer"
                  target="_blank"
                >
                  Open official source
                </a>
              )}
              <Link
                href="/source-and-accuracy-policy"
                className="block text-sm font-bold text-[var(--accent)] hover:underline"
              >
                Source and accuracy policy
              </Link>
            </div>
          </EventDetailSection>
        </aside>
      </div>
    </div>
  );
}
