"use client";

import { collectPassportStamps } from "@/lib/plan/passport";
import type { PlanItem } from "@/lib/types/occurrence";

export function ResortPassport({ items }: { items: PlanItem[] }) {
  const stamps = collectPassportStamps(items);
  if (stamps.length === 0) return null;

  return (
    <section
      className="passport-panel rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
      aria-labelledby="passport-heading"
    >
      <h2 id="passport-heading" className="font-display text-lg font-semibold">
        Resort passport
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Stamps earned from activities you&apos;ve saved.
      </p>
      <ul className="mt-4 flex flex-wrap gap-3">
        {stamps.map((stamp) => (
          <li
            key={stamp.id}
            className="passport-stamp inline-flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-[var(--color-card-border)] px-3 py-2 text-sm font-bold"
          >
            <span aria-hidden>{stamp.icon}</span>
            <span>{stamp.label}</span>
            {stamp.count > 1 && (
              <span className="text-xs text-[var(--color-muted)]">×{stamp.count}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
