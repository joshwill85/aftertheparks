"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoodChips } from "@/components/home/MoodChips";
import type { Daypart } from "@/lib/types/occurrence";

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "", label: "Any time" },
  { value: "tonight", label: "Tonight" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
] as const;

const VIBE_OPTIONS = [
  { value: "", label: "Any vibe" },
  { value: "poolside", label: "Pool break" },
  { value: "campfire", label: "Campfires" },
  { value: "movies_under_stars", label: "Movies" },
  { value: "arts_crafts", label: "Crafts & kids" },
  { value: "arcade", label: "Rain-friendly" },
  { value: "fitness_wellness", label: "Wellness" },
] as const;

interface QuickFinderProps {
  resorts?: { slug: string; name: string }[];
}

export function QuickFinder({ resorts = [] }: QuickFinderProps) {
  const router = useRouter();
  const [date, setDate] = useState("today");
  const [where, setWhere] = useState("");
  const [vibe, setVibe] = useState("");

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

    if (date && date !== "today" && date !== "tonight") {
      params.set("daypart", date as Daypart);
    }

    const qs = params.toString();
    router.push(qs ? `/activities?${qs}` : "/activities");
  };

  return (
    <div className="quick-finder">
      <form onSubmit={handleSubmit} className="quick-finder__form">
        <div className="quick-finder__fields">
          <label className="quick-finder__field">
            <span className="quick-finder__label">Date</span>
            <select
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

          <label className="quick-finder__field">
            <span className="quick-finder__label">Where</span>
            <select
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
        </button>
      </form>

      <MoodChips />
    </div>
  );
}
