import type { ActivityOffering } from "@/lib/types/occurrence";
import { getCategoryMeta } from "@/lib/categories/meta";
import {
  getPublicOfferingAvailabilityLabel,
  shouldShowOfferingAvailability,
} from "@/lib/activityAvailabilityDisplay";

function priceLabel(state: ActivityOffering["price"]["state"]): string {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return "Price unclear";
}

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
}: {
  offering: ActivityOffering;
  showResort?: boolean;
}) {
  const meta = getCategoryMeta(offering.category);
  const notes = bookingNotes(offering);
  const showAvailability = shouldShowOfferingAvailability(offering.availability);
  const availabilityLabel = getPublicOfferingAvailabilityLabel(
    offering.availability
  );

  return (
    <article className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--color-surface)] text-xl"
          aria-hidden
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
              {meta.label}
            </p>
            <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
              {priceLabel(offering.price.state)}
            </span>
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

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
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

      {offering.source?.url && (
        <a
          href={offering.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-bold text-[var(--accent)] hover:underline"
        >
          Official Disney source
        </a>
      )}
    </article>
  );
}
