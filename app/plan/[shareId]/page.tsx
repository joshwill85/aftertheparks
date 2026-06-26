import { getPlanShare } from "@/lib/data/activities";
import type { PlanItem } from "@/lib/types/occurrence";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlanSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const plan = await getPlanShare(shareId);

  if (!plan) notFound();
  const items = plan.payload as PlanItem[];

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold">
        View-only legacy shared plan
      </h1>
      <p className="mb-6 text-[var(--color-muted)]">
        Someone shared this older plan snapshot with you. It is preserved here
        for reading and will not change your My Plan.
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id ?? `${item.activityCatalogId}-${item.addedAt}`}
            className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
          >
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-[var(--color-muted)]">{item.resortName}</p>
            {item.location && (
              <p className="text-xs text-[var(--color-muted)]">{item.location}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
