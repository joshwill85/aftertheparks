"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

export function CalendarClient({
  occurrences,
}: {
  occurrences: ActivityOccurrence[];
}) {
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityOccurrence[]>();
    for (const o of occurrences) {
      if (!o.startDateTime) continue;
      const key = format(parseISO(o.startDateTime), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [occurrences]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1))
          }
          className="rounded-lg border border-[var(--color-card-border)] px-3 py-1"
        >
          ←
        </button>
        <h2 className="font-display text-xl font-semibold">
          {format(month, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1))
          }
          className="rounded-lg border border-[var(--color-card-border)] px-3 py-1"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = byDay.get(key)?.length ?? 0;
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={`min-h-16 rounded-lg border p-1 text-sm ${
                isSameMonth(day, month)
                  ? "border-[var(--color-card-border)] bg-[var(--color-card)]"
                  : "opacity-40"
              } ${today ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <span className="font-medium">{format(day, "d")}</span>
              {count > 0 && (
                <div className="mt-1 flex justify-center gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
