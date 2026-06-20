"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlan } from "@/components/atlas/PlanProvider";
import { sharePlanCalendar, sharePlanLink } from "@/lib/plan/share";
import type { PlanItem } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

function SortableItem({
  item,
  onRemove,
}: {
  item: PlanItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
    >
      <button
        type="button"
        className="cursor-grab text-[var(--color-muted)]"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </button>
      <div className="flex-1">
        <p className="font-medium">{item.title}</p>
        <p className="text-sm text-[var(--color-muted)]">{item.resortName}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-lantern)]"
      >
        Remove
      </button>
    </li>
  );
}

export function PlanPageClient() {
  const { items, removeItem, reorderItems, createShare, shareUrl } = usePlan();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    reorderItems(next);
  };

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
    else if (result === "copied") setShareStatus("Link copied — paste into Messages or Mail.");
    else if (result === "failed") setShareStatus(null);
  };

  const handleExport = async () => {
    setExportStatus(null);
    const result = await sharePlanCalendar(items);
    if (result === "shared") setExportStatus("Calendar file shared.");
    else if (result === "downloaded") setExportStatus("Calendar file downloaded.");
  };

  const lanternGlow =
    items.length >= 3 && process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--color-card-border)] p-12 text-center text-[var(--color-muted)]">
        Your plan is empty. Browse{" "}
        <Link href="/activities" className="text-[var(--accent)] hover:underline">
          activities
        </Link>{" "}
        and tap Save to build your itinerary.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((item) => (
              <SortableItem key={item.id} item={item} onRemove={removeItem} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            "rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white",
            lanternGlow && "lantern-glow"
          )}
        >
          Share plan
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-xl border border-[var(--color-card-border)] px-5 py-2.5 text-sm"
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
