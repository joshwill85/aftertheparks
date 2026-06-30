"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { PlanItem } from "@/components/plan/PlanItem";
import { PlanTransportEdge } from "@/components/plan/PlanTransportEdge";
import {
  buildPlanStayShell,
  groupPlanByDate,
  PLAN_SECTION_ORDER,
  PLAN_SECTION_META,
  type PlanSectionKey,
} from "@/lib/plan/sections";
import {
  buildPlanDaybookPath,
} from "@/lib/plan/daybookPath";
import { useTransportConnectionsForItems } from "@/lib/plan/useTransportConnections";
import type { PlanTransportConnectionMap } from "@/lib/plan/transportConnections";
import type { IconKey } from "@/components/icons/iconRegistry";
import type { ActivityOccurrence, PlanItem as PlanItemType } from "@/lib/types/occurrence";
import type { PlanStaySettings } from "@/lib/plan/types";

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
  staySettings?: PlanStaySettings;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}

type PlanDaybookDay = {
  dateKey: string;
  label: string;
  sections: Map<PlanSectionKey, PlanItemType[]>;
};

export function PlanTimeline({
  items,
  staySettings = {},
  onRemove,
  onUpdateNotes,
  backupCandidates = [],
  onSaveBackup,
  onSwap,
}: PlanTimelineProps) {
  const dayGroups = groupPlanByDate(items);
  const stayShell = buildPlanStayShell(items, staySettings);
  const transportConnections = useTransportConnectionsForItems(items);

  return (
    <div className="plan-timeline space-y-10">
      {stayShell.enabled ? (
        <>
          {stayShell.stayDays.map((day) =>
            day.items.length > 0 ? (
              <PlanDaybook
                key={day.dateKey}
                day={day}
                transportConnections={transportConnections}
                onRemove={onRemove}
                onUpdateNotes={onUpdateNotes}
                backupCandidates={backupCandidates}
                onSaveBackup={onSaveBackup}
                onSwap={onSwap}
              />
            ) : (
              <EmptyStayDay
                key={day.dateKey}
                day={day}
                findHomeResortHref={day.findHomeResortHref ?? stayShell.findHomeResortHref}
                findNearbyHref={day.findNearbyHref ?? stayShell.findNearbyHref}
              />
            )
          )}
          {stayShell.outsideStayItems.length > 0 && (
            <PlanDateGroupCollection
              title="Outside stay dates"
              items={stayShell.outsideStayItems}
              transportConnections={transportConnections}
              onRemove={onRemove}
              onUpdateNotes={onUpdateNotes}
              backupCandidates={backupCandidates}
              onSaveBackup={onSaveBackup}
              onSwap={onSwap}
            />
          )}
          {stayShell.flexibleItems.length > 0 && (
            <FlexiblePlanItems
              items={stayShell.flexibleItems}
              onRemove={onRemove}
              onUpdateNotes={onUpdateNotes}
              backupCandidates={backupCandidates}
              onSaveBackup={onSaveBackup}
              onSwap={onSwap}
            />
          )}
        </>
      ) : (
        dayGroups.map((day) => (
          <PlanDaybook
            key={day.dateKey}
            day={day}
            transportConnections={transportConnections}
            onRemove={onRemove}
            onUpdateNotes={onUpdateNotes}
            backupCandidates={backupCandidates}
            onSaveBackup={onSaveBackup}
            onSwap={onSwap}
          />
        ))
      )}
    </div>
  );
}

function PlanDaybook({
  day,
  transportConnections,
  onRemove,
  onUpdateNotes,
  backupCandidates = [],
  onSaveBackup,
  onSwap,
}: {
  day: PlanDaybookDay;
  transportConnections?: PlanTransportConnectionMap;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}) {
  const visibleSections = PLAN_SECTION_ORDER.filter(
    (key) => (day.sections.get(key)?.length ?? 0) > 0
  );
  const dayItems = visibleSections.flatMap((key) => day.sections.get(key) ?? []);
  const dayPath = buildPlanDaybookPath(dayItems, transportConnections);
  const pathByItemId = new Map(dayPath.stops.map((stop) => [stop.itemId, stop]));

  return (
    <div className="plan-daybook">
      <h3 className="font-display mb-5 text-2xl font-semibold">{day.label}</h3>
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
                    {connector && <PlanTransportEdge connector={connector} />}
                    <PlanItem
                      item={item}
                      onRemove={onRemove}
                      onUpdateNotes={onUpdateNotes}
                      backupCandidates={backupCandidates}
                      onSaveBackup={onSaveBackup}
                      onSwap={onSwap}
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
}

function EmptyStayDay({
  day,
  findHomeResortHref,
  findNearbyHref,
}: {
  day: PlanDaybookDay;
  findHomeResortHref?: string;
  findNearbyHref?: string;
}) {
  return (
    <section className="plan-daybook rounded-2xl border border-dashed border-[var(--border-soft)] bg-white/70 p-5">
      <h3 className="font-display text-2xl font-semibold">{day.label}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        This stay day is open. Add something relaxed, nearby, or weather-flexible when
        you are ready.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {findHomeResortHref && (
          <Link href={findHomeResortHref} className="btn-secondary text-sm font-bold">
            Find things at my resort
          </Link>
        )}
        {findNearbyHref && (
          <Link href={findNearbyHref} className="btn-secondary text-sm font-bold">
            Find nearby options
          </Link>
        )}
        <Link href="/activities" className="btn-secondary text-sm font-bold">
          Explore all activities
        </Link>
      </div>
    </section>
  );
}

function PlanDateGroupCollection({
  title,
  items,
  transportConnections,
  onRemove,
  onUpdateNotes,
  backupCandidates = [],
  onSaveBackup,
  onSwap,
}: {
  title: string;
  items: PlanItemType[];
  transportConnections?: PlanTransportConnectionMap;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}) {
  return (
    <section className="space-y-5">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      {groupPlanByDate(items).map((day) => (
        <PlanDaybook
          key={day.dateKey}
          day={day}
          transportConnections={transportConnections}
          onRemove={onRemove}
          onUpdateNotes={onUpdateNotes}
          backupCandidates={backupCandidates}
          onSaveBackup={onSaveBackup}
          onSwap={onSwap}
        />
      ))}
    </section>
  );
}

function FlexiblePlanItems({
  items,
  onRemove,
  onUpdateNotes,
  backupCandidates = [],
  onSaveBackup,
  onSwap,
}: {
  items: PlanItemType[];
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  backupCandidates?: ActivityOccurrence[];
  onSaveBackup?: (activity: ActivityOccurrence) => void;
  onSwap?: (itemId: string, activity: ActivityOccurrence) => void;
}) {
  return (
    <section className="plan-daybook">
      <PlanSection title={PLAN_SECTION_META.unscheduled.title} iconKey={PLAN_SECTION_META.unscheduled.iconKey}>
        {items.map((item) => (
          <PlanItem
            key={item.id}
            item={item}
            onRemove={onRemove}
            onUpdateNotes={onUpdateNotes}
            backupCandidates={backupCandidates}
            onSaveBackup={onSaveBackup}
            onSwap={onSwap}
          />
        ))}
      </PlanSection>
    </section>
  );
}
