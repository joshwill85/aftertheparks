"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/components/atlas/PlanProvider";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { ensureAnonymousSession } from "@/lib/plan/sync-client";
import { executeTurnstile } from "@/lib/turnstile/browser";
import type { PublicPlanResponse } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

interface PublicPlanClientProps {
  token: string;
  initial: PublicPlanResponse;
}

export function PublicPlanClient({ token, initial }: PublicPlanClientProps) {
  const { openPreview, refreshFromServer } = usePlan();
  const [plan, setPlan] = useState(initial);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

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
        <span className="stamp-badge">View only</span>
        <h1 className="font-display mt-3 text-3xl font-bold">{plan.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          A live look at the plan. Changes appear here as the day evolves.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Last updated{" "}
          {new Date(plan.lastUpdatedAt).toLocaleString("en-US", {
            timeZone: plan.timezone,
          })}
        </p>
      </div>

      {plan.ownerSession ? (
        <Link href="/plan" className="btn-primary inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white">
          Edit my plan
        </Link>
      ) : (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--color-sun-cream)] px-5 py-4 text-sm text-[var(--muted)]">
          <p>
            This is a view-only link. Copy these ideas into your own My Plan to
            edit them on this device.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {plan.dates.map((group) => (
          <section key={group.date}>
            <h2 className="font-display mb-3 text-xl font-semibold">{group.date}</h2>
            <ul className="space-y-3">
              {group.items.map((item, idx) => (
                <li
                  key={`${group.date}-${idx}`}
                  className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3"
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-[var(--muted)]">{item.resortName}</p>
                  {item.location && (
                    <p className="text-xs text-[var(--muted)]">{item.location}</p>
                  )}
                  {item.startsAt && (
                    <p className="mt-1 text-xs font-bold text-[var(--lagoon-deep)]">
                      {new Date(item.startsAt).toLocaleTimeString("en-US", {
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
              ))}
            </ul>
          </section>
        ))}
      </div>

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
