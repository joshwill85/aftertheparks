"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlan } from "@/components/atlas/PlanProvider";
import type { RestDayVibe, RestDayWho } from "@/lib/plan/restDay";
import { cn } from "@/lib/utils";

interface RestDayBuilderProps {
  resorts: { slug: string; name: string }[];
}

const VIBE_OPTIONS: { value: RestDayVibe; label: string; hint: string }[] = [
  { value: "relaxed", label: "Relaxed", hint: "Pool, crafts, movie" },
  { value: "active", label: "Active", hint: "Movement + evening fun" },
  { value: "evening", label: "Evening magic", hint: "Campfire & starlight" },
];

const WHO_OPTIONS: { value: RestDayWho; label: string }[] = [
  { value: "little_kids", label: "Little kids" },
  { value: "family", label: "Whole family" },
  { value: "couple", label: "Just us two" },
];

export function RestDayBuilder({ resorts }: RestDayBuilderProps) {
  const router = useRouter();
  const { addActivities } = usePlan();
  const [resort, setResort] = useState(resorts[0]?.slug ?? "");
  const [vibe, setVibe] = useState<RestDayVibe>("relaxed");
  const [who, setWho] = useState<RestDayWho>("family");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBuild = async () => {
    if (!resort) {
      setStatus("Pick a resort to start.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/plan/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resort, vibe, who }),
      });
      const data = await res.json();

      if (!res.ok || !data.activities?.length) {
        setStatus(
          "We couldn't find enough activities for that combo — try another resort or vibe."
        );
        return;
      }

      addActivities(data.activities);
      router.push("/plan");
    } catch {
      setStatus("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rest-day-builder">
      <h2 id="rest-day-heading" className="rest-day-builder__title font-display">
        Build a low-stress rest day
      </h2>
      <p className="rest-day-builder__copy">
        Pick your resort, who&apos;s along, and the vibe — we&apos;ll stack a gentle
        afternoon into your plan.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Where
          </span>
          <select
            value={resort}
            onChange={(e) => setResort(e.target.value)}
            className="form-control"
          >
            {resorts.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="text-sm">
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Who
          </legend>
          <div className="flex flex-wrap gap-2">
            {WHO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setWho(option.value)}
                className={cn(
                  "filter-pill",
                  who === option.value && "filter-pill--active"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="text-sm sm:col-span-3">
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Vibe
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {VIBE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVibe(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-colors",
                  vibe === option.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--color-card-border)] bg-[var(--color-card)]"
                )}
              >
                <span className="block font-bold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        type="button"
        onClick={handleBuild}
        disabled={loading}
        className={cn("btn-primary mt-6 px-6 text-sm", loading && "opacity-60")}
      >
        {loading ? "Building…" : "Build my rest day"}
      </button>

      {status && (
        <p className="mt-3 text-sm text-[var(--color-muted)]" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
