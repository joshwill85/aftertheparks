"use client";

import { useMemo, useState } from "react";
import { buildPlanBackupSuggestions } from "@/lib/plan/swaps";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";

export function PlanSwapSuggestions({
  item,
  candidates,
  onSaveBackup,
  onSwap,
}: {
  item: PlanItem;
  candidates: ActivityOccurrence[];
  onSaveBackup: (activity: ActivityOccurrence) => void;
  onSwap: (itemId: string, activity: ActivityOccurrence) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const suggestions = useMemo(
    () => buildPlanBackupSuggestions(item, candidates, { limit: 3 }),
    [candidates, item]
  );

  if (suggestions.length === 0) return null;

  return (
    <section className="plan-swap-suggestions" aria-label={`Backup ideas for ${item.title}`}>
      <div className="plan-swap-suggestions__header">
        <p className="plan-swap-suggestions__eyebrow">Find indoor backup</p>
        <p>
          Weather-sensitive plans work better with a nearby indoor or covered
          option. These suggestions are not urgent rain alerts.
        </p>
      </div>
      <ul className="plan-swap-suggestions__list">
        {suggestions.map(({ activity, reasons }) => {
          const confirming = confirmingId === activity.id;
          return (
            <li key={activity.id} className="plan-swap-suggestions__item">
              <span>
                <strong>{activity.title}</strong>
                <small>
                  {activity.resort.name}
                  {activity.location?.label ? ` · ${activity.location.label}` : ""}
                </small>
                <small>{reasons.slice(0, 3).join(" · ")}</small>
              </span>
              <span className="plan-swap-suggestions__actions">
                <button
                  type="button"
                  onClick={() => onSaveBackup(activity)}
                  className="plan-swap-suggestions__action"
                >
                  Save backup
                </button>
                {confirming ? (
                  <button
                    type="button"
                    onClick={() => onSwap(item.id, activity)}
                    className="plan-swap-suggestions__action plan-swap-suggestions__action--danger"
                  >
                    Confirm swap
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(activity.id)}
                    className="plan-swap-suggestions__action"
                  >
                    Swap this
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
