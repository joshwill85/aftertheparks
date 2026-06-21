"use client";

import { useState } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getDisplayTime,
  getDisplayTitle,
  occurrenceToDisplayInput,
} from "@/lib/activityDisplay";
import type { PlanItem as PlanItemType } from "@/lib/types/occurrence";
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
  dragHandle?: React.ReactNode;
  style?: React.CSSProperties;
  setNodeRef?: (node: HTMLElement | null) => void;
}

function PlanItemCard({
  item,
  onRemove,
  onUpdateNotes,
  dragHandle,
  style,
  setNodeRef,
}: PlanItemCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(item.notes ?? "");
  const display = planItemToDisplayInput(item);
  const title = getDisplayTitle(display);
  const time = getDisplayTime(display);

  const saveNotes = () => {
    onUpdateNotes?.(item.id, draftNotes.trim());
    setEditingNotes(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="plan-item flex items-start gap-3 rounded-[22px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-sm"
    >
      {dragHandle}

      <div className="min-w-0 flex-1">
        <Link
          href={`/activities/${item.activitySlug}`}
          className="font-display text-lg font-semibold leading-tight hover:text-[var(--accent)]"
        >
          {title}
        </Link>
        <p className="mt-1 text-sm font-bold text-[var(--color-foreground)]/72">
          {item.resortName}
        </p>
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
        {!item.startDateTime && (
          <p className="mt-1.5 text-sm font-bold text-[var(--color-muted)]">
            {time.label}
          </p>
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
  sortable?: boolean;
}

export function PlanItem({
  item,
  onRemove,
  onUpdateNotes,
  sortable = false,
}: PlanItemProps) {
  if (sortable) {
    return (
      <SortablePlanItem
        item={item}
        onRemove={onRemove}
        onUpdateNotes={onUpdateNotes}
      />
    );
  }

  return (
    <PlanItemCard
      item={item}
      onRemove={onRemove}
      onUpdateNotes={onUpdateNotes}
    />
  );
}

function SortablePlanItem({
  item,
  onRemove,
  onUpdateNotes,
}: {
  item: PlanItemType;
  onRemove: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      type="button"
      className="mt-0.5 cursor-grab touch-none text-[var(--color-muted)] active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
    >
      <span className="text-lg leading-none" aria-hidden>
        ⋮⋮
      </span>
    </button>
  );

  return (
    <PlanItemCard
      item={item}
      onRemove={onRemove}
      onUpdateNotes={onUpdateNotes}
      dragHandle={dragHandle}
      style={style}
      setNodeRef={setNodeRef}
    />
  );
}
