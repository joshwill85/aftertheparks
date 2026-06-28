"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { PlanItem } from "@/components/plan/PlanItem";
import { PlanWeatherPanel } from "@/components/weather/PlanWeatherPanel";
import {
  buildPlanStayShell,
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
import type { PlanStaySettings } from "@/lib/plan/types";
import { inferActivityWeatherFit } from "@/lib/weather/guidance";
import { scorePlanResilience } from "@/lib/weather/resilience";
import type { WeatherForTimeSpan } from "@/lib/weather/types";

function isFuturePlanItem(item: PlanItemType, now = new Date()): boolean {
  if (!item.startDateTime) return true;
  const end = item.endDateTime ?? item.startDateTime;
  return new Date(end).getTime() >= now.getTime();
}

function isWeatherSensitivePlanItem(item: PlanItemType): boolean {
  return inferActivityWeatherFit({
    title: item.title,
    category: item.category ?? "resort_activity",
  }).some((fit) =>
    [
      "outdoor_uncovered",
      "outdoor_shaded",
      "pool",
      "campfire",
      "outdoor_movie",
      "boat_dependent",
      "skyliner_dependent",
      "walking_heavy",
      "heat_sensitive",
      "storm_sensitive",
    ].includes(fit)
  );
}

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
  staySettings?: PlanStaySettings;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
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
}: PlanTimelineProps) {
  const [panelWeather, setPanelWeather] = useState<WeatherForTimeSpan | null>(null);
  const dayGroups = groupPlanByDate(items);
  const stayShell = buildPlanStayShell(items, staySettings);
  const futureItems = items.filter((item) => isFuturePlanItem(item));
  const weatherSensitiveItems = futureItems.filter(isWeatherSensitivePlanItem);
  const indoorBackupCount = futureItems.filter((item) =>
    inferActivityWeatherFit({
      title: item.title,
      category: item.category ?? "resort_activity",
    }).some((fit) => fit === "indoor" || fit === "covered" || fit === "mostly_indoor")
  ).length;
  const sameResortBackupCount = new Set(
    futureItems
      .filter((item) =>
        inferActivityWeatherFit({
          title: item.title,
          category: item.category ?? "resort_activity",
        }).some((fit) => fit === "indoor" || fit === "covered")
      )
      .map((item) => item.resortSlug)
  ).size;
  const resilience = scorePlanResilience({
    futureItems: futureItems.length,
    weatherSensitiveItems: weatherSensitiveItems.length,
    itemsWithIndoorBackups: indoorBackupCount,
    sameResortBackupCount,
    transportWeatherRisk: weatherSensitiveItems.length > indoorBackupCount ? "medium" : "low",
    stormModeActive: false,
    heatRisk: "medium",
    rainRisk: "medium",
  });
  const weatherFocusItem = useMemo(
    () => weatherSensitiveItems.find((item) => item.startDateTime) ?? null,
    [weatherSensitiveItems]
  );
  const backupHref = weatherFocusItem?.resortSlug
    ? `/activities?resort=${weatherFocusItem.resortSlug}&weather=indoor`
    : "/activities?weather=indoor";
  const replaceHref = weatherFocusItem?.resortSlug
    ? `/activities?resort=${weatherFocusItem.resortSlug}&weather=covered`
    : "/activities?weather=covered";

  useEffect(() => {
    if (!weatherFocusItem?.startDateTime) {
      setPanelWeather(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      startsAt: weatherFocusItem.startDateTime,
      includePrecipMap: "true",
    });
    if (weatherFocusItem.endDateTime) params.set("endsAt", weatherFocusItem.endDateTime);
    if (weatherFocusItem.resortSlug) params.set("resortSlug", weatherFocusItem.resortSlug);

    fetch(`/api/weather/guidance?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { guidance?: WeatherForTimeSpan } | null) => {
        setPanelWeather(body?.guidance ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPanelWeather(null);
      });

    return () => controller.abort();
  }, [weatherFocusItem]);

  const applyWeatherNote = (note: string) => {
    for (const item of weatherSensitiveItems) {
      const nextNote = item.notes ? `${item.notes}\n${note}` : note;
      onUpdateNotes(item.id, nextNote);
    }
  };

  return (
    <div className="plan-timeline space-y-10">
      {items.length > 0 && (
        <PlanWeatherPanel
          weather={panelWeather}
          resilience={resilience}
          affectedItemCount={weatherSensitiveItems.length}
          backupHref={backupHref}
          replaceHref={replaceHref}
          onApplyWeatherNote={applyWeatherNote}
        />
      )}
      {stayShell.enabled ? (
        <>
          {stayShell.stayDays.map((day) =>
            day.items.length > 0 ? (
              <PlanDaybook
                key={day.dateKey}
                day={day}
                onRemove={onRemove}
                onUpdateNotes={onUpdateNotes}
              />
            ) : (
              <EmptyStayDay
                key={day.dateKey}
                day={day}
                findHomeResortHref={stayShell.findHomeResortHref}
                findNearbyHref={stayShell.findNearbyHref}
              />
            )
          )}
          {stayShell.outsideStayItems.length > 0 && (
            <PlanDateGroupCollection
              title="Outside stay dates"
              items={stayShell.outsideStayItems}
              onRemove={onRemove}
              onUpdateNotes={onUpdateNotes}
            />
          )}
          {stayShell.flexibleItems.length > 0 && (
            <FlexiblePlanItems
              items={stayShell.flexibleItems}
              onRemove={onRemove}
              onUpdateNotes={onUpdateNotes}
            />
          )}
        </>
      ) : (
        dayGroups.map((day) => (
          <PlanDaybook
            key={day.dateKey}
            day={day}
            onRemove={onRemove}
            onUpdateNotes={onUpdateNotes}
          />
        ))
      )}
    </div>
  );
}

function PlanDaybook({
  day,
  onRemove,
  onUpdateNotes,
}: {
  day: PlanDaybookDay;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const visibleSections = PLAN_SECTION_ORDER.filter(
    (key) => (day.sections.get(key)?.length ?? 0) > 0
  );
  const dayItems = visibleSections.flatMap((key) => day.sections.get(key) ?? []);
  const dayPath = buildPlanDaybookPath(dayItems);
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
                    {connector && <PlanPathConnector connector={connector} />}
                    <PlanItem item={item} onRemove={onRemove} onUpdateNotes={onUpdateNotes} />
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
  onRemove,
  onUpdateNotes,
}: {
  title: string;
  items: PlanItemType[];
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  return (
    <section className="space-y-5">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      {groupPlanByDate(items).map((day) => (
        <PlanDaybook
          key={day.dateKey}
          day={day}
          onRemove={onRemove}
          onUpdateNotes={onUpdateNotes}
        />
      ))}
    </section>
  );
}

function FlexiblePlanItems({
  items,
  onRemove,
  onUpdateNotes,
}: {
  items: PlanItemType[];
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
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
          />
        ))}
      </PlanSection>
    </section>
  );
}
