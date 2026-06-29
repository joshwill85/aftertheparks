"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addOrlandoDays, getDayOfWeekIndex, orlandoDateString } from "@/lib/daypart";

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tonight", label: "Tonight" },
  { value: "plan_ahead", label: "Plan ahead" },
  { value: "this_weekend", label: "This weekend" },
  { value: "choose_dates", label: "Choose dates" },
] as const;

const VIBE_OPTIONS = [
  { value: "", label: "Any vibe" },
  { value: "poolside", label: "Pool break" },
  { value: "campfire", label: "Campfires" },
  { value: "movies_under_stars", label: "Movies" },
  { value: "arts_crafts", label: "Crafts & kids" },
  { value: "arcade", label: "Games" },
  { value: "fitness_wellness", label: "Wellness" },
] as const;

interface QuickFinderProps {
  resorts?: { slug: string; name: string }[];
}

function nextWeekendRange(today = orlandoDateString()) {
  const day = getDayOfWeekIndex(today);
  const daysUntilFriday = (5 - day + 7) % 7;
  const start = addOrlandoDays(today, daysUntilFriday);
  return {
    start,
    end: addOrlandoDays(start, 2),
  };
}

export function QuickFinder({ resorts = [] }: QuickFinderProps) {
  const router = useRouter();
  const [date, setDate] = useState("today");
  const [where, setWhere] = useState("");
  const [vibe, setVibe] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (where) params.set("resort", where);
    if (vibe) params.set("category", vibe);

    if (date === "tonight") {
      const qs = params.toString();
      router.push(qs ? `/tonight?${qs}` : "/tonight");
      return;
    }

    if (date === "today") {
      const qs = params.toString();
      router.push(qs ? `/today?${qs}` : "/today");
      return;
    }

    if (date === "this_weekend") {
      const range = nextWeekendRange();
      params.set("start", range.start);
      params.set("end", range.end);
      params.set("selected", range.start);
      const qs = params.toString();
      router.push(qs ? `/calendar?${qs}` : "/calendar");
      return;
    }

    if (date === "choose_dates") {
      if (customStart) params.set("start", customStart);
      if (customEnd) params.set("end", customEnd);
      if (customStart) params.set("selected", customStart);
      const qs = params.toString();
      router.push(qs ? `/calendar?${qs}` : "/calendar");
      return;
    }

    if (date === "plan_ahead") {
      const qs = params.toString();
      router.push(qs ? `/calendar?${qs}` : "/calendar");
      return;
    }

    const qs = params.toString();
    router.push(qs ? `/activities?${qs}` : "/activities");
  };

  return (
    <div className="quick-finder">
      <form
        action="/calendar"
        method="get"
        onSubmit={handleSubmit}
        className="quick-finder__form"
      >
        <div className="quick-finder__fields">
          <label className="quick-finder__field">
            <span className="quick-finder__label">Date</span>
            <select
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="quick-finder__select form-control"
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt.value || "any"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {date === "choose_dates" && (
            <>
              <label className="quick-finder__field">
                <span className="quick-finder__label">Start</span>
                <input
                  name="start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="quick-finder__select form-control"
                />
              </label>
              <label className="quick-finder__field">
                <span className="quick-finder__label">End</span>
                <input
                  name="end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="quick-finder__select form-control"
                />
              </label>
            </>
          )}

          <label className="quick-finder__field">
            <span className="quick-finder__label">Where</span>
            <select
              name="resort"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              className="quick-finder__select form-control"
            >
              <option value="">All resorts</option>
              {resorts.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="quick-finder__field">
            <span className="quick-finder__label">Vibe</span>
            <select
              name="category"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="quick-finder__select form-control"
            >
              {VIBE_OPTIONS.map((opt) => (
                <option key={opt.value || "any"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className="quick-finder__cta btn-primary">
          Find activities
          <span
            className="hidden-resort-magic hrm-quick-bubbles"
            data-hidden-detail="quick_finder_bubble_trail"
            aria-hidden
          />
        </button>
        <Link href="/tonight" className="btn-secondary quick-finder__cta">
          {"See tonight's movies and campfires"}
        </Link>
      </form>

    </div>
  );
}
