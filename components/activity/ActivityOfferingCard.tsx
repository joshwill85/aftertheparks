import { IconGlyph } from "@/components/icons/IconGlyph";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";
import { getCategoryMeta } from "@/lib/categories/meta";
import {
  formatOfferingAvailabilityLabel,
  formatOfferingTimingLabel,
} from "@/lib/activityOfferingDisplay";
import { shouldShowOfferingAvailability } from "@/lib/activityAvailabilityDisplay";
import {
  optionalPriceAddOnsLabel,
  publicPriceDetail,
  publicPriceLabel,
} from "@/lib/priceLabels";

function bookingNotes(offering: ActivityOffering): string[] {
  const notes: string[] = [];
  if (offering.booking?.reservationRequired) {
    notes.push("Reservations required");
  } else if (offering.booking?.reservationRecommended) {
    notes.push("Reservations recommended");
  }
  if (offering.eligibility.resortGuestOnly) {
    notes.push("Resort guests only");
  }
  if (offering.booking?.cancellationNoticeHours) {
    notes.push(`${offering.booking.cancellationNoticeHours}-hour cancellation notice`);
  }
  return notes;
}

export function ActivityOfferingCard({
  offering,
  showResort = false,
  nextSession,
}: {
  offering: ActivityOffering;
  showResort?: boolean;
  nextSession?: ActivityOccurrence;
}) {
  const meta = getCategoryMeta(offering.category);
  const notes = bookingNotes(offering);
  const availabilityLabel = formatOfferingAvailabilityLabel(offering, nextSession);
  const timingLabel = formatOfferingTimingLabel(offering, nextSession);
  const showAvailability =
    Boolean(nextSession) || shouldShowOfferingAvailability(offering.availability);
  const addOnsLabel = optionalPriceAddOnsLabel(offering.price.options);
  const priceDetail = publicPriceDetail(offering.price);
  const priceLabel = publicPriceLabel(offering.price.state);
  const highlights = offering.amenities.slice(0, 4);

  return (
    <article className="activity-offering-card rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--color-surface)] text-xl"
          aria-hidden
        >
          <IconGlyph iconKey={meta.iconKey} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
              {meta.label}
            </p>
            {priceLabel && (
              <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                {priceLabel}
              </span>
            )}
            {priceDetail && (
              <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                {priceDetail}
              </span>
            )}
            {addOnsLabel && (
              <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                {addOnsLabel}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
            {offering.title}
          </h3>
          {showResort && (
            <p className="mt-1 text-sm font-semibold text-[var(--color-muted)]">
              {offering.resort.name}
            </p>
          )}
          {offering.summary && (
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {offering.summary}
            </p>
          )}
        </div>
      </div>

      <dl className="activity-offering-card__facts mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {timingLabel && (
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Timing</dt>
            <dd className="mt-1 text-[var(--color-muted)]">
              {timingLabel}
            </dd>
          </div>
        )}
        {showAvailability && (
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Availability</dt>
            <dd className="mt-1 text-[var(--color-muted)]">
              {availabilityLabel}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-[var(--brand-ink)]">Location</dt>
          <dd className="mt-1 text-[var(--color-muted)]">
            {offering.location.label}
          </dd>
        </div>
      </dl>

      {highlights.length > 0 && (
        <section className="mt-4">
          <h4 className="text-sm font-bold text-[var(--brand-ink)]">
            Highlights
          </h4>
          <ul className="mt-2 grid gap-2 text-sm leading-5 text-[var(--color-muted)]">
            {highlights.map((highlight) => (
              <li key={highlight} className="activity-offering-card__highlight">
                {highlight}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[var(--brand-ink)]">
          {notes.map((note) => (
            <li
              key={note}
              className="rounded-full bg-[var(--color-surface)] px-3 py-1"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

    </article>
  );
}
