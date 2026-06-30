"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePlan } from "@/components/atlas/PlanProvider";
import { BrandMark, BrandMotif } from "@/components/brand/BrandAsset";
import { PlanMagicCheck } from "@/components/plan/PlanMagicCheck";
import { PlanTransportEdge } from "@/components/plan/PlanTransportEdge";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { ensureAnonymousSession } from "@/lib/plan/sync-client";
import { executeTurnstile } from "@/lib/turnstile/browser";
import { buildPlanDaybookPath } from "@/lib/plan/daybookPath";
import {
  itemPlanSection,
  PLAN_SECTION_META,
  PLAN_SECTION_ORDER,
} from "@/lib/plan/sections";
import { useTransportConnectionsForItems } from "@/lib/plan/useTransportConnections";
import type { PublicPlanResponse } from "@/lib/plan/types";
import type { PlanItem } from "@/lib/types/occurrence";
import { cn } from "@/lib/utils";

interface PublicPlanClientProps {
  token: string;
  initial: PublicPlanResponse;
}

function labelFromSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function publicItemId(date: string, index: number, title: string): string {
  return `${date}-${index}-${title}`;
}

function publicItemToPlanItem(
  item: PublicPlanResponse["dates"][number]["items"][number],
  date: string,
  index: number
): PlanItem {
  const id = publicItemId(date, index, item.title);
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    title: item.title,
    resortSlug: item.resortSlug,
    resortName: item.resortName,
    category: item.category,
    location: item.location,
    startDateTime: item.startsAt,
    endDateTime: item.endsAt,
    addedAt: item.startsAt ?? new Date(0).toISOString(),
    priceLabel: item.priceLabel,
    sourceVerifiedAt: item.sourceVerifiedAt,
    sourceStatus: item.sourceStatus,
  };
}

function dayTicketDateLabel(plan: PublicPlanResponse): string {
  if (plan.tripStartDate && plan.tripEndDate) {
    return plan.tripStartDate === plan.tripEndDate
      ? plan.tripStartDate
      : `${plan.tripStartDate} to ${plan.tripEndDate}`;
  }
  return plan.dates.map((group) => group.date).join(" · ");
}

function travelRiskLabel(items: PlanItem[]): string {
  const resorts = new Set(items.map((item) => item.resortSlug).filter(Boolean));
  if (resorts.size <= 1) return "Low";
  if (resorts.size === 2) return "Confirm route";
  return "Build in buffers";
}

function hasWeatherSensitiveItem(items: PlanItem[]): boolean {
  return items.some((item) =>
    ["campfire", "movies_under_stars", "poolside", "nighttime_entertainment"].includes(
      item.category ?? ""
    )
  );
}

export function PublicPlanClient({ token, initial }: PublicPlanClientProps) {
  const { openPreview, refreshFromServer } = usePlan();
  const [plan, setPlan] = useState(initial);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const publicPlanItems = useMemo(
    () =>
      plan.dates.flatMap((group) =>
        group.items.map((item, index) =>
          publicItemToPlanItem(item, group.date, index)
        )
      ),
    [plan.dates]
  );
  const transportConnections = useTransportConnectionsForItems(publicPlanItems);
  const dayTicket = useMemo(
    () => ({
      dateLabel: dayTicketDateLabel(plan),
      activityCount: publicPlanItems.length,
      resortCount: new Set(publicPlanItems.map((item) => item.resortSlug)).size,
      travelRisk: travelRiskLabel(publicPlanItems),
      weather: hasWeatherSensitiveItem(publicPlanItems)
        ? "Keep an indoor backup nearby"
        : "Check day-of conditions",
    }),
    [plan, publicPlanItems]
  );

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-plan/${encodeURIComponent(token)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      setPlan(await res.json());
    } catch {
      /* keep the last known live view */
    }
  }, [token]);

  useEffect(() => {
    trackPlanEvent("plan_share_opened");
  }, []);

  useEffect(() => {
    const onFocus = () => void refreshPlan();
    const onVisibilityChange = () => {
      if (!document.hidden) void refreshPlan();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(() => void refreshPlan(), 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshPlan]);

  const handleCopy = async () => {
    setCopying(true);
    setCopyStatus(null);
    try {
      const turnstileToken = await executeTurnstile("shared_plan_copy");
      await ensureAnonymousSession(turnstileToken);
      const res = await fetch(`/api/shared-plan/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Copy failed");

      trackPlanEvent("shared_plan_items_added", {
        added: data.added,
        skipped: data.skipped,
      });
      setCopyStatus(
        `Added ${data.added} ${data.added === 1 ? "activity" : "activities"}${
          data.skipped ? ` (${data.skipped} already in your plan)` : ""
        }.`
      );
      await refreshFromServer();
      openPreview();
    } catch {
      setCopyStatus(
        "Saved on this device if we could not sync. Try again when online."
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="public-plan space-y-6">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-white/90 px-5 py-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark variant="horizontal" className="brand-mark--footer" />
          <BrandMotif className="brand-motif--divider" />
        </div>
        <span className="stamp-badge">View only</span>
        <h1 className="font-display mt-3 text-3xl font-bold">{plan.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          A live look at the plan. Changes appear here as the day evolves.
        </p>
        {(plan.homeResortSlug || (plan.tripStartDate && plan.tripEndDate)) && (
          <p className="mt-2 text-sm font-semibold text-[var(--lagoon-deep)]">
            {[
              labelFromSlug(plan.homeResortSlug),
              plan.tripStartDate && plan.tripEndDate
                ? `${plan.tripStartDate} to ${plan.tripEndDate}`
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--muted)]">
          Last updated{" "}
          {new Date(plan.lastUpdatedAt).toLocaleString("en-US", {
            timeZone: plan.timezone,
          })}
        </p>
      </div>

      <section
        className="rounded-2xl border border-[var(--border-soft)] bg-[var(--color-sun-cream)] px-5 py-4"
        aria-labelledby="resort-day-ticket-heading"
      >
        <p className="stamp-badge">Resort Day Ticket</p>
        <h2 id="resort-day-ticket-heading" className="font-display mt-3 text-2xl font-semibold">
          {plan.title}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Date</dt>
            <dd className="text-[var(--muted)]">{dayTicket.dateLabel || "Date flexible"}</dd>
          </div>
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Activities</dt>
            <dd className="text-[var(--muted)]">
              {dayTicket.activityCount} saved {dayTicket.activityCount === 1 ? "idea" : "ideas"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Travel risk</dt>
            <dd className="text-[var(--muted)]">{dayTicket.travelRisk}</dd>
          </div>
          <div>
            <dt className="font-bold text-[var(--brand-ink)]">Weather</dt>
            <dd className="text-[var(--muted)]">{dayTicket.weather}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[var(--muted)]">
          This is a view-only link. Copy these ideas into your own My Plan to
          edit them on this device.
        </p>
      </section>

      <PlanMagicCheck items={publicPlanItems} readOnly />

      <div className="space-y-6">
        {plan.dates.map((group) => (
          <section key={group.date}>
            <h2 className="font-display mb-3 text-xl font-semibold">{group.date}</h2>
              {(() => {
                const groupPlanItems = group.items.map((item, index) =>
                  publicItemToPlanItem(item, group.date, index)
                );
                const sectionGroups = PLAN_SECTION_ORDER.map((sectionKey) => ({
                  sectionKey,
                  items: groupPlanItems.filter(
                    (item) => itemPlanSection(item) === sectionKey
                  ),
                })).filter((section) => section.items.length > 0);
                const path = buildPlanDaybookPath(
                  groupPlanItems,
                  transportConnections
                );
                const pathByItemId = new Map(
                  path.stops.map((stop) => [stop.itemId, stop])
                );

                return (
                  <div className="space-y-4" aria-label={path.ariaLabel}>
                    {sectionGroups.map(({ sectionKey, items }) => (
                      <section key={sectionKey} className="space-y-3">
                        <h3 className="font-display text-base font-semibold">
                          {PLAN_SECTION_META[sectionKey].title}
                        </h3>
                        <ul className="space-y-3">
                          {items.map((item) => {
                            const connector = pathByItemId.get(item.id)?.connectorBefore;

                            return (
                              <Fragment key={item.id}>
                                {connector && <PlanTransportEdge connector={connector} />}
                                <li className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3">
                                  <p className="font-semibold">{item.title}</p>
                                  <p className="text-sm text-[var(--muted)]">{item.resortName}</p>
                                  {item.location && (
                                    <p className="text-xs text-[var(--muted)]">{item.location}</p>
                                  )}
                                  {item.startDateTime && (
                                    <p className="mt-1 text-xs font-bold text-[var(--lagoon-deep)]">
                                      {new Date(item.startDateTime).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        timeZone: plan.timezone,
                                      })}
                                    </p>
                                  )}
                                  {item.sourceStatus !== "current" && (
                                    <p
                                      className={cn(
                                        "mt-2 text-xs font-bold",
                                        item.sourceStatus === "changed"
                                          ? "text-[var(--color-coral)]"
                                          : "text-[var(--muted)]"
                                      )}
                                    >
                                      {item.sourceStatus === "changed"
                                        ? "Schedule changed since this was saved"
                                        : "May no longer be available"}
                                    </p>
                                  )}
                                </li>
                              </Fragment>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                );
              })()}
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white/90 px-5 py-4">
        <h2 className="font-display text-xl font-semibold">Transportation disclosures</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Transportation routes, operating hours, and resort access can change.
          Confirm current transportation day-of and build in a buffer before
          moving between resorts.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white/90 px-5 py-4">
        <h2 className="font-display text-xl font-semibold">Weather caveats</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Outdoor activities, poolside recreation, movies, campfires, boats, and
          longer walks can change with weather. Keep a nearby indoor or covered
          backup when the forecast is uncertain.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white/90 px-5 py-4">
        <h2 className="font-display text-xl font-semibold">Source and freshness</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          After the Parks keeps this shared view live, but Disney and resort
          teams remain the official source for current times, access, pricing,
          weather decisions, and operating changes.
        </p>
      </section>

      {!plan.ownerSession && (
        <div className="sticky bottom-4 z-10 rounded-2xl border border-[var(--border-soft)] bg-white/95 p-4 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className="btn-primary w-full rounded-full py-3 text-sm font-bold text-white"
          >
            {copying ? "Adding…" : "Add these ideas to My Plan"}
          </button>
          {copyStatus && (
            <p className="mt-2 text-center text-sm text-[var(--muted)]" role="status">
              {copyStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
