"use client";

import { useState } from "react";
import { PlanEmptyState } from "@/components/plan/PlanEmptyState";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { usePlan } from "@/components/atlas/PlanProvider";
import { sharePlanCalendar, sharePlanLink } from "@/lib/plan/share";
import { cn } from "@/lib/utils";

export function PlanPageClient() {
  const { items, removeItem, reorderItems, createShare, shareUrl } = usePlan();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

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
      <PlanTimeline
        items={items}
        onRemove={removeItem}
        onReorder={reorderItems}
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
