"use client";

import { PlanItem } from "@/components/plan/PlanItem";
import {
  groupPlanByDate,
  PLAN_SECTION_ORDER,
  PLAN_SECTION_META,
  type PlanSectionKey,
} from "@/lib/plan/sections";
import type { PlanItem as PlanItemType } from "@/lib/types/occurrence";

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
        <h4 className="font-display text-lg font-semibold">{title}</h4>
      </header>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

interface PlanTimelineProps {
  items: PlanItemType[];
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export function PlanTimeline({
  items,
  onRemove,
  onUpdateNotes,
}: PlanTimelineProps) {
  const dayGroups = groupPlanByDate(items);

  return (
    <div className="plan-timeline space-y-10">
      {dayGroups.map((day) => {
        const visibleSections = PLAN_SECTION_ORDER.filter(
          (key) => (day.sections.get(key)?.length ?? 0) > 0
        );

        return (
          <div key={day.dateKey} className="plan-daybook">
            <h3 className="font-display mb-5 text-2xl font-semibold">
              {day.label}
            </h3>
            <div className="space-y-8">
              {visibleSections.map((sectionKey: PlanSectionKey) => {
                const sectionItems = day.sections.get(sectionKey) ?? [];
                const { title, icon } = PLAN_SECTION_META[sectionKey];

                return (
                  <PlanSection key={sectionKey} title={title} icon={icon}>
                    {sectionItems.map((item) => (
                      <PlanItem
                        key={item.id}
                        item={item}
                        onRemove={onRemove}
                        onUpdateNotes={onUpdateNotes}
                      />
                    ))}
                  </PlanSection>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
