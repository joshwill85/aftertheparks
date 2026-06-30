"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDisplayTime,
  getDisplayTitle,
  occurrenceToDisplayInput,
} from "@/lib/activityDisplay";
import { getLivingState, livingStateLabel } from "@/lib/plan/living";
import { activityDetailHref } from "@/lib/activities/links";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { PlanSwapSuggestions } from "@/components/plan/PlanSwapSuggestions";
import { EventWeatherSignal } from "@/components/weather/EventWeatherSignal";
import type { ActivityOccurrence, PlanItem as PlanItemType } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

function planItemToDisplayInput(item: PlanItemType) {
  return occurrenceToDisplayInput({
    title: item.title,
    category: item.category ?? "resort_activity",
    activitySlug: item.activitySlug,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    resort: { name: item.resortName },
  });
}

interface PlanItemCardProps {
  item: PlanItemType;
  onRemove: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}

function PlanItemCard({
  item,
  onRemove,
  onUpdateNotes,
  backupCandidates = [],
  onSaveBackup,
  onSwap,
}: PlanItemCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(item.notes ?? "");
  const display = planItemToDisplayInput(item);
  const title = getDisplayTitle(display);
  const time = getDisplayTime(display);
  const living = getLivingState(item);
  const livingLabel = livingStateLabel(living);
  const reservationRequired = item.snapshotJson?.reservationRequired === true;

  useEffect(() => {
    if (item.sourceStatus === "changed" || item.sourceStatus === "unavailable") {
      trackPlanEvent("plan_schedule_change_displayed", {
        status: item.sourceStatus,
      });
    }
  }, [item.sourceStatus]);

  const saveNotes = () => {
    onUpdateNotes?.(item.id, draftNotes.trim());
    setEditingNotes(false);
  };

  return (
    <li
      className="plan-item flex items-start gap-3 rounded-[22px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <Link
          href={activityDetailHref(item.activitySlug, item.resortSlug)}
          className="font-display text-lg font-semibold leading-tight hover:text-[var(--accent)]"
        >
          {title}
        </Link>
        {livingLabel && (
          <span className="plan-living-badge mt-1 inline-flex rounded-full bg-[var(--lagoon)]/12 px-2 py-0.5 text-xs font-bold text-[var(--lagoon-deep)]">
            {livingLabel}
          </span>
        )}
        {item.sourceStatus === "changed" && (
          <p className="mt-1 text-xs font-bold text-[var(--color-coral)]">
            A little changed since you saved this.
          </p>
        )}
        {item.sourceStatus === "unavailable" && (
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">
            May no longer be available
          </p>
        )}
        <p className="mt-1 text-sm font-bold text-[var(--color-foreground)]/72">
          {item.resortName}
        </p>
        <dl className="mt-2 grid gap-1 text-xs text-[var(--color-muted)] sm:grid-cols-2">
          {item.location && (
            <div>
              <dt className="sr-only">Location</dt>
              <dd>{item.location}</dd>
            </div>
          )}
          {item.category && (
            <div>
              <dt className="sr-only">Category</dt>
              <dd>{item.category.replace(/_/g, " ")}</dd>
            </div>
          )}
          {item.priceLabel && (
            <div>
              <dt className="sr-only">Price</dt>
              <dd>{item.priceLabel}</dd>
            </div>
          )}
          {reservationRequired && (
            <div>
              <dt className="sr-only">Reservation</dt>
              <dd>Reservation required</dd>
            </div>
          )}
        </dl>
        {(item.sourceVerifiedAt || item.sourceUrl) && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {item.sourceVerifiedAt && (
              <span>
                Source verified{" "}
                <time dateTime={item.sourceVerifiedAt}>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(item.sourceVerifiedAt))}
                </time>
              </span>
            )}
            {item.sourceVerifiedAt && item.sourceUrl && <span> · </span>}
            {item.sourceUrl && (
              <Link href={item.sourceUrl} className="font-bold text-[var(--accent)] hover:underline">
                View source
              </Link>
            )}
          </p>
        )}
        {item.startDateTime && (
          <time
            dateTime={item.startDateTime}
            className={cn(
              "mt-1.5 block text-sm font-bold",
              time.uncertain
                ? "text-[#7a4a00]"
                : "text-[var(--color-lagoon)]"
            )}
          >
            {time.label}
          </time>
        )}
        {!item.startDateTime && time.label && (
          <p className="mt-1.5 text-sm font-bold text-[var(--color-muted)]">
            {time.label}
          </p>
        )}

        {item.startDateTime && (
          <EventWeatherSignal
            className="plan-item__weather"
            resortSlug={item.resortSlug}
            startsAt={item.startDateTime}
            endsAt={item.endDateTime}
          />
        )}

        {item.notes && !editingNotes && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{item.notes}</p>
        )}

        {onUpdateNotes && (
          <div className="mt-3">
            {editingNotes ? (
              <div className="space-y-2">
                <label className="sr-only" htmlFor={`notes-${item.id}`}>
                  Notes for {title}
                </label>
                <textarea
                  id={`notes-${item.id}`}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={2}
                  placeholder="Add a reminder — stroller parking, s'mores kits, etc."
                  className="form-control mt-3"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveNotes}
                    className="min-h-9 rounded-full bg-[var(--accent)] px-3 text-xs font-bold text-white"
                  >
                    Save note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftNotes(item.notes ?? "");
                      setEditingNotes(false);
                    }}
                    className="min-h-9 rounded-full px-3 text-xs font-bold text-[var(--color-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="text-xs font-bold text-[var(--accent)] hover:underline"
              >
                {item.notes ? "Edit note" : "Add note"}
              </button>
            )}
          </div>
        )}

        {onSaveBackup && onSwap && backupCandidates.length > 0 && (
          <PlanSwapSuggestions
            item={item}
            candidates={backupCandidates}
            onSaveBackup={onSaveBackup}
            onSwap={onSwap}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="plan-item__remove shrink-0"
      >
        Remove
      </button>
    </li>
  );
}

interface PlanItemProps {
  item: PlanItemType;
  onRemove: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}

export function PlanItem({
  item,
  onRemove,
  onUpdateNotes,
  backupCandidates,
  onSaveBackup,
  onSwap,
}: PlanItemProps) {
  return (
    <PlanItemCard
      item={item}
      onRemove={onRemove}
      onUpdateNotes={onUpdateNotes}
      backupCandidates={backupCandidates}
      onSaveBackup={onSaveBackup}
      onSwap={onSwap}
    />
  );
}
