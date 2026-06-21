"use client";

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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { parseISO } from "date-fns";
import { PlanItem } from "@/components/plan/PlanItem";
import { daypartFromHour, hourInOrlando } from "@/lib/daypart";
import type { Daypart, PlanItem as PlanItemType } from "@/lib/types/occurrence";

const DAYPART_ORDER: Daypart[] = ["morning", "afternoon", "evening", "late"];

const SECTION_META: Record<
  Daypart,
  { title: string; icon: string }
> = {
  morning: { title: "Morning", icon: "☀️" },
  afternoon: { title: "Afternoon", icon: "🌴" },
  evening: { title: "Evening", icon: "🏮" },
  late: { title: "Starlight", icon: "🌙" },
};

function itemDaypart(item: PlanItemType): Daypart {
  if (!item.startDateTime) return "afternoon";
  const hour = hourInOrlando(parseISO(item.startDateTime));
  return daypartFromHour(hour);
}

function groupByDaypart(items: PlanItemType[]): Map<Daypart, PlanItemType[]> {
  const groups = new Map<Daypart, PlanItemType[]>(
    DAYPART_ORDER.map((dp) => [dp, []])
  );
  for (const item of items) {
    groups.get(itemDaypart(item))!.push(item);
  }
  return groups;
}

function PlanSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="plan-section">
      <header className="plan-section__header mb-3 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
      </header>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

interface PlanTimelineProps {
  items: PlanItemType[];
  onRemove: (id: string) => void;
  onReorder: (items: PlanItemType[]) => void;
}

export function PlanTimeline({ items, onRemove, onReorder }: PlanTimelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const grouped = groupByDaypart(items);
  const visibleSections = DAYPART_ORDER.filter(
    (dp) => (grouped.get(dp)?.length ?? 0) > 0
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="plan-timeline space-y-8">
          {visibleSections.map((daypart) => {
            const sectionItems = grouped.get(daypart) ?? [];
            const { title, icon } = SECTION_META[daypart];

            return (
              <PlanSection key={daypart} title={title} icon={icon}>
                {sectionItems.map((item) => (
                  <PlanItem
                    key={item.id}
                    item={item}
                    onRemove={onRemove}
                    sortable
                  />
                ))}
              </PlanSection>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
