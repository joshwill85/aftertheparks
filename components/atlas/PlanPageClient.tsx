"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanEmptyState } from "@/components/plan/PlanEmptyState";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { ResortPassport } from "@/components/plan/ResortPassport";
import { usePlan } from "@/components/atlas/PlanProvider";
import { findPlanConflicts } from "@/lib/plan/conflicts";
import { sharePlanCalendar, sharePlanLink } from "@/lib/plan/share";
import { cn } from "@/lib/utils";

export function PlanPageClient() {
  const { items, removeItem, reorderItems, updateNotes, createShare, shareUrl } =
    usePlan();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const conflicts = findPlanConflicts(items);
  const lowStress =
    items.length >= 2 && items.length <= 4 && conflicts.length === 0;

  const handleShare = async () => {
    setShareStatus(null);
    const url = await createShare();
    if (!url) {
      setShareStatus("Could not create share link. Try again.");
      return;
    }
    const result = await sharePlanLink(url, items);
    if (result === "shared") setShareStatus("Shared!");
    else if (result === "copied")
      setShareStatus("Link copied — paste into Messages or Mail.");
    else if (result === "failed") setShareStatus(null);
  };

  const handleExport = async () => {
    setExportStatus(null);
    const result = await sharePlanCalendar(items);
    if (result === "shared") setExportStatus("Calendar file shared.");
    else if (result === "downloaded")
      setExportStatus("Calendar file downloaded.");
  };

  const lanternGlow =
    items.length >= 3 && process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

  if (items.length === 0) {
    return <PlanEmptyState />;
  }

  return (
    <div className="space-y-6">
      {lowStress && (
        <div className="rounded-2xl border border-[var(--color-palm)]/30 bg-[var(--color-palm)]/8 px-5 py-4">
          <p className="font-display text-lg font-semibold text-[var(--color-palm)]">
            Low-stress rest day
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            A gentle mix of stops — room to breathe between activities.
          </p>
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className="rounded-2xl border border-[var(--color-coral)]/35 bg-[var(--color-coral)]/8 px-5 py-4"
          role="alert"
        >
          <p className="font-bold text-[var(--color-coral)]">Schedule overlap</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
            {conflicts.map((conflict) => (
              <li key={`${conflict.a.id}-${conflict.b.id}`}>
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ResortPassport items={items} />

      <PlanTimeline
        items={items}
        onRemove={removeItem}
        onReorder={reorderItems}
        onUpdateNotes={updateNotes}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            "btn-primary min-h-11 rounded-full px-5 text-sm font-bold text-white",
            lanternGlow && "lantern-glow"
          )}
        >
          Share plan
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary min-h-11 rounded-full px-5 text-sm font-bold"
        >
          Add to calendar
        </button>
        <Link
          href="/activities"
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          Add more
        </Link>
      </div>
      {shareStatus && (
        <p className="text-sm text-[var(--color-muted)]" role="status">
          {shareStatus}
        </p>
      )}
      {exportStatus && (
        <p className="text-sm text-[var(--color-muted)]" role="status">
          {exportStatus}
        </p>
      )}
      {shareUrl && (
        <p className="text-sm text-[var(--color-muted)]">
          Last share link:{" "}
          <a href={shareUrl} className="text-[var(--accent)] hover:underline">
            {shareUrl}
          </a>
        </p>
      )}
    </div>
  );
}
