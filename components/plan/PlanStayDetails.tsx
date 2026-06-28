"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanStaySettings } from "@/lib/plan/types";

interface PlanStayDetailsProps {
  resorts: { slug: string; name: string }[];
  homeResortSlug?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  onSave: (settings: PlanStaySettings) => void;
}

export function PlanStayDetails({
  resorts,
  homeResortSlug,
  tripStartDate,
  tripEndDate,
  onSave,
}: PlanStayDetailsProps) {
  const [resortSlug, setResortSlug] = useState(homeResortSlug ?? "");
  const [startDate, setStartDate] = useState(tripStartDate ?? "");
  const [endDate, setEndDate] = useState(tripEndDate ?? "");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setResortSlug(homeResortSlug ?? "");
    setStartDate(tripStartDate ?? "");
    setEndDate(tripEndDate ?? "");
  }, [homeResortSlug, tripStartDate, tripEndDate]);

  const selectedResortName = useMemo(
    () => resorts.find((resort) => resort.slug === homeResortSlug)?.name,
    [homeResortSlug, resorts]
  );
  const hasStayDetails = Boolean(homeResortSlug || (tripStartDate && tripEndDate));
  const dateError =
    (startDate && !endDate) || (!startDate && endDate)
      ? "Add both check-in and check-out dates, or leave both blank."
      : startDate && endDate && startDate > endDate
        ? "Check-out date must be on or after check-in."
        : null;

  const save = () => {
    if (dateError) {
      setStatus(dateError);
      return;
    }
    onSave({
      homeResortSlug: resortSlug || undefined,
      tripStartDate: startDate || undefined,
      tripEndDate: endDate || undefined,
    });
    setStatus("Stay details saved.");
  };

  const clear = () => {
    setResortSlug("");
    setStartDate("");
    setEndDate("");
    onSave({});
    setStatus("Stay details cleared. Your saved ideas are still here.");
  };

  return (
    <section className="plan-stay-details rounded-2xl border border-[var(--border-soft)] bg-white/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Stay details</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Staying somewhere? Add resort and dates to shape your itinerary.
          </p>
        </div>
        {hasStayDetails && (
          <p className="rounded-full bg-[var(--color-sun-cream)] px-3 py-1 text-xs font-bold text-[var(--lagoon-deep)]">
            {selectedResortName ?? "Stay details active"}
          </p>
        )}
      </div>

      <div className="plan-stay-details__fields">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Resort
          </span>
          <select
            value={resortSlug}
            onChange={(event) => setResortSlug(event.target.value)}
            className="form-control plan-stay-details__control"
          >
            <option value="">No resort selected</option>
            {resorts.map((resort) => (
              <option key={resort.slug} value={resort.slug}>
                {resort.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Check-in
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="form-control plan-stay-details__control"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Check-out
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="form-control plan-stay-details__control"
          />
        </label>
      </div>

      {status && (
        <p
          className={`mt-3 text-sm ${dateError ? "text-[var(--color-coral)]" : "text-[var(--muted)]"}`}
          role="status"
        >
          {status}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          className="btn-primary min-h-11 rounded-full px-5 text-sm font-bold text-white"
        >
          Save stay details
        </button>
        {hasStayDetails && (
          <button
            type="button"
            onClick={clear}
            className="btn-secondary min-h-11 rounded-full px-5 text-sm font-bold"
          >
            Clear stay details
          </button>
        )}
      </div>
    </section>
  );
}
