"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlanEmptyState } from "@/components/plan/PlanEmptyState";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { PlanPaceMeter } from "@/components/plan/PlanPaceMeter";
import { PlanStorySummary } from "@/components/plan/PlanStorySummary";
import { ResortPassport } from "@/components/plan/ResortPassport";
import { PlanSyncBadge } from "@/components/plan/PlanSyncBadge";
import { PlanStayDetails } from "@/components/plan/PlanStayDetails";
import { usePlan } from "@/components/atlas/PlanProvider";
import { findPlanConflicts } from "@/lib/plan/conflicts";
import { sharePlanCalendar, sharePlanLink } from "@/lib/plan/share";
import { trackPlanEvent } from "@/lib/plan/analytics";

export function PlanPageClient({
  resorts,
}: {
  resorts: { slug: string; name: string }[];
}) {
  const {
    items,
    planTitle,
    homeResortSlug,
    tripStartDate,
    tripEndDate,
    removeItem,
    updateNotes,
    renamePlan,
    updatePlanSettings,
    createShare,
    rotateShare,
    revokeShare,
    shareUrl,
    hasExistingShare,
    deletePlan,
    undoItem,
    undoRemove,
  } = usePlan();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(planTitle);
  const [showSettings, setShowSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const conflicts = findPlanConflicts(items);

  useEffect(() => {
    trackPlanEvent("plan_page_opened");
  }, []);

  useEffect(() => {
    setTitleDraft(planTitle);
  }, [planTitle]);

  useEffect(() => {
    if (conflicts.length > 0) {
      trackPlanEvent("plan_overlap_displayed", { count: conflicts.length });
    }
  }, [conflicts.length]);

  const handleShare = async () => {
    setShareStatus(null);
    const url = await createShare();
    if (!url) {
      setShareStatus(
        hasExistingShare
          ? "A share link already exists. Replace it to copy a new URL, or revoke it."
          : "Could not create share link. Try again."
      );
      return;
    }
    const result = await sharePlanLink(url, items);
    if (result === "shared") {
      setShareStatus("Shared!");
      trackPlanEvent("plan_share_copied");
    } else if (result === "copied") {
      setShareStatus("Link copied — anyone with it can view your live plan.");
      trackPlanEvent("plan_share_copied");
    }
  };

  const handleExport = async () => {
    setExportStatus(null);
    const result = await sharePlanCalendar(items);
    if (result === "shared") setExportStatus("Calendar file shared.");
    else if (result === "downloaded")
      setExportStatus("Calendar file downloaded.");
    else if (result === "empty")
      setExportStatus("No timed activities to add to calendar yet.");
  };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PlanStayDetails
          resorts={resorts}
          homeResortSlug={homeResortSlug}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onSave={updatePlanSettings}
        />
        {tripStartDate && tripEndDate && (
          <PlanTimeline
            items={[]}
            staySettings={{ homeResortSlug, tripStartDate, tripEndDate }}
            onRemove={() => undefined}
            onUpdateNotes={() => undefined}
          />
        )}
        <PlanEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                renamePlan(titleDraft);
                setEditingTitle(false);
              }}
            >
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="font-display w-full rounded-xl border border-[var(--border-soft)] px-3 py-2 text-2xl font-bold"
                autoFocus
                maxLength={80}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="font-display text-left text-3xl font-bold hover:text-[var(--lagoon-deep)]"
            >
              {planTitle}
            </button>
          )}
          <p className="mt-1 text-sm text-[var(--muted)]">Rest Day Magic</p>
        </div>
        <PlanSyncBadge />
      </div>

      {undoItem && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm"
          role="status"
        >
          <span>Removed {undoItem.title}</span>
          <button
            type="button"
            onClick={undoRemove}
            className="font-bold text-[var(--lagoon-deep)]"
          >
            Undo
          </button>
        </div>
      )}

      <PlanPaceMeter items={items} />

      <PlanStayDetails
        resorts={resorts}
        homeResortSlug={homeResortSlug}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onSave={updatePlanSettings}
      />

      <PlanStorySummary items={items} />

      {conflicts.length > 0 && (
        <div
          className="rounded-2xl border border-[var(--color-coral)]/25 bg-[var(--color-coral)]/6 px-5 py-4"
          role="alert"
        >
          <p className="font-bold text-[var(--color-coral)]">
            Two good options at the same time
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
            {conflicts.map((conflict) => (
              <li key={`${conflict.a.id}-${conflict.b.id}`}>{conflict.message}</li>
            ))}
          </ul>
        </div>
      )}

      <ResortPassport items={items} />

      <PlanTimeline
        items={items}
        staySettings={{ homeResortSlug, tripStartDate, tripEndDate }}
        onRemove={removeItem}
        onUpdateNotes={updateNotes}
      />

      <div className="rounded-2xl border border-[var(--border-soft)] bg-white/90 p-5">
        <p className="text-sm text-[var(--muted)]">
          Anyone with this link can view your live plan. Only you can edit it.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="btn-primary min-h-11 rounded-full px-5 text-sm font-bold text-white"
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
            Add an activity
          </Link>
        </div>
        {shareStatus && (
          <p className="mt-3 text-sm text-[var(--color-muted)]" role="status">
            {shareStatus}
          </p>
        )}
        {exportStatus && (
          <p className="mt-2 text-sm text-[var(--color-muted)]" role="status">
            {exportStatus}
          </p>
        )}
        {shareUrl && (
          <p className="mt-3 break-all text-sm text-[var(--color-muted)]">
            Live link:{" "}
            <a href={shareUrl} className="text-[var(--accent)] hover:underline">
              {shareUrl}
            </a>
          </p>
        )}
        {(shareUrl || hasExistingShare) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void rotateShare().then((url) => {
                  setShareStatus(
                    url
                      ? "Replacement link ready. Use Share plan to copy it."
                      : "Could not replace share link. Try again."
                  );
                })
              }
              className="text-xs font-bold text-[var(--lagoon-deep)]"
            >
              Replace link
            </button>
            <button
              type="button"
              onClick={() => void revokeShare()}
              className="text-xs font-bold text-[var(--color-coral)]"
            >
              Revoke link
            </button>
          </div>
        )}
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="text-xs font-semibold text-[var(--muted)]"
        >
          Plan settings
        </button>
      </div>

      {showSettings && (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-white/80 p-4 text-sm">
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="font-bold text-[var(--color-coral)]"
            >
              Delete plan permanently
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[var(--muted)]">
                This removes your plan and stops shared links from working.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void deletePlan()}
                  className="btn-primary rounded-full px-4 py-2 text-xs font-bold text-white"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="btn-secondary rounded-full px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
