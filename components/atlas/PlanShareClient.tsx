"use client";

import { useEffect, useState } from "react";
import type { PlanItem } from "@/lib/types/occurrence";
import { savePlanItems } from "@/lib/plan/store";
import { useRouter } from "next/navigation";

export function PlanShareClient({ items }: { items: PlanItem[] }) {
  const router = useRouter();
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!items?.length || imported) return;
    savePlanItems(items).then(() => {
      setImported(true);
      router.replace("/plan");
    });
  }, [items, imported, router]);

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-[var(--color-muted)]">
        {imported ? "Opening your plan…" : "Loading shared plan…"}
      </p>
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
    </div>
  );
}
