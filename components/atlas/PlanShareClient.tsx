"use client";

import type { PlanItem } from "@/lib/types/occurrence";
import { savePlanItems } from "@/lib/plan/store";
import { useRouter } from "next/navigation";

export function PlanShareClient({ items }: { items: PlanItem[] }) {
  const router = useRouter();

  const importPlan = async () => {
    await savePlanItems(items);
    router.push("/plan");
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {(items ?? []).map((item) => (
          <li
            key={item.id ?? item.activityCatalogId}
            className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
          >
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-[var(--color-muted)]">{item.resortName}</p>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={importPlan}
        className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm text-white"
      >
        Save to my plan
      </button>
    </div>
  );
}
