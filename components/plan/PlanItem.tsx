"use client";

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
    category: "resort_activity",
    activitySlug: item.activitySlug,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    resort: { name: item.resortName },
  });
}

interface PlanItemCardProps {
  item: PlanItemType;
  onRemove: (id: string) => void;
  dragHandle?: React.ReactNode;
  style?: React.CSSProperties;
  setNodeRef?: (node: HTMLElement | null) => void;
}

function PlanItemCard({
  item,
  onRemove,
  dragHandle,
  style,
  setNodeRef,
}: PlanItemCardProps) {
  const display = planItemToDisplayInput(item);
  const title = getDisplayTitle(display);
  const time = getDisplayTime(display);

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
        <p
          className={cn(
            "mt-1.5 text-sm font-bold",
            time.uncertain
              ? "text-[#7a4a00]"
              : "text-[var(--color-lagoon)]"
          )}
        >
          {time.label}
        </p>
        {item.notes && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{item.notes}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-sm font-bold text-[var(--color-muted)] hover:text-[var(--color-lantern)]"
      >
        Remove
      </button>
    </li>
  );
}

interface PlanItemProps {
  item: PlanItemType;
  onRemove: (id: string) => void;
  sortable?: boolean;
}

export function PlanItem({ item, onRemove, sortable = false }: PlanItemProps) {
  if (sortable) {
    return <SortablePlanItem item={item} onRemove={onRemove} />;
  }

  return <PlanItemCard item={item} onRemove={onRemove} />;
}

function SortablePlanItem({
  item,
  onRemove,
}: {
  item: PlanItemType;
  onRemove: (id: string) => void;
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
      dragHandle={dragHandle}
      style={style}
      setNodeRef={setNodeRef}
    />
  );
}
