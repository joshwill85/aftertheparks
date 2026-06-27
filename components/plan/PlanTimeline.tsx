"use client";

import { Fragment, type ReactNode } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { PlanItem } from "@/components/plan/PlanItem";
import {
  groupPlanByDate,
  PLAN_SECTION_ORDER,
  PLAN_SECTION_META,
  type PlanSectionKey,
} from "@/lib/plan/sections";
import {
  buildPlanDaybookPath,
  type PlanDaybookConnector,
} from "@/lib/plan/daybookPath";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { PlanItem as PlanItemType } from "@/lib/types/occurrence";

function PlanPathConnector({
  connector,
}: {
  connector: PlanDaybookConnector;
}) {
  return (
    <li
      className={`plan-path-connector plan-path-connector--${connector.tone} plan-path-connector--${connector.severity}`}
      aria-label={connector.ariaLabel}
    >
      <span className="plan-path-connector__icon" aria-hidden>
        <IconGlyph iconKey={connector.iconKey} decorative />
      </span>
      <span className="plan-path-connector__copy">
        <strong>{connector.label}</strong>
        <small>{connector.detail}</small>
      </span>
    </li>
  );
}

function PlanSection({
  title,
  iconKey,
  children,
}: {
  title: string;
  iconKey: IconKey;
  children: ReactNode;
}) {
  return (
    <section className="plan-section">
      <header className="plan-section__header mb-3 flex items-center gap-2">
        <IconGlyph iconKey={iconKey} className="text-xl" />
        <h4 className="font-display text-lg font-semibold">{title}</h4>
      </header>
      <ul className="plan-section__items">{children}</ul>
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
        const dayItems = visibleSections.flatMap(
          (key) => day.sections.get(key) ?? []
        );
        const dayPath = buildPlanDaybookPath(dayItems);
        const pathByItemId = new Map(
          dayPath.stops.map((stop) => [stop.itemId, stop])
        );

        return (
          <div key={day.dateKey} className="plan-daybook">
            <h3 className="font-display mb-5 text-2xl font-semibold">
              {day.label}
            </h3>
            <div className="plan-daybook__sections" aria-label={dayPath.ariaLabel}>
              {visibleSections.map((sectionKey: PlanSectionKey) => {
                const sectionItems = day.sections.get(sectionKey) ?? [];
                const { title, iconKey } = PLAN_SECTION_META[sectionKey];

                return (
                  <PlanSection key={sectionKey} title={title} iconKey={iconKey}>
                    {sectionItems.map((item) => {
                      const connector = pathByItemId.get(item.id)?.connectorBefore;

                      return (
                        <Fragment key={item.id}>
                          {connector && <PlanPathConnector connector={connector} />}
                          <PlanItem
                            item={item}
                            onRemove={onRemove}
                            onUpdateNotes={onUpdateNotes}
                          />
                        </Fragment>
                      );
                    })}
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
